// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
//
// Réconciliation wallet CivicLoop multi-appareil.
//
// Problème résolu : un citoyen peut accumuler un wallet en tant qu'invité anonyme
// (openId local à l'appareil) AVANT de se connecter à un compte réel existant
// (créé sur un autre appareil, ou déjà présent). Sans fusion, ce wallet invité
// serait orphelin — crédits et missions perdus.
//
// Règles absolues :
//  - Fusion UNIQUEMENT invité (sans email/password) → compte réel. Ne fusionne
//    JAMAIS deux comptes réels entre eux (email des deux côtés = abandon, erreur).
//  - Jamais de perte de crédit, jamais de doublon de crédit.
//  - Une mission déjà validée côté compte réel n'est jamais re-créditée si
//    l'invité l'avait aussi validée séparément (dédoublonnage par mission_id).
//  - Historique des transactions toujours conservé (ré-attaché, jamais supprimé).
//  - Idempotent : rejouer la fusion pour la même paire ne doit rien casser
//    (donorId déjà marqué merged_into_user_id => no-op silencieux).
//  - Tout en une seule transaction SQL avec verrous FOR UPDATE, ordre déterministe
//    par id croissant pour éviter les deadlocks en cas de fusions concurrentes.
import { db } from '../db';
import { logAudit } from './auth';

export interface MergeResult {
  merged: boolean;
  reason?: 'noop_same_user' | 'donor_not_found' | 'donor_has_account' | 'already_merged_elsewhere' | 'ok';
  creditsTransferred?: number;
  missionsReattached?: number;
  missionsDeduped?: number;
}

/**
 * Tente de fusionner le wallet CivicLoop d'un openId d'appareil (invité) dans le
 * compte réel `receiverUserId` en cours de connexion. Ne fait rien si l'openId
 * correspond déjà au compte, n'existe pas, ou appartient à un AUTRE vrai compte.
 * Sûr à appeler à chaque login, même si aucune fusion n'est nécessaire.
 */
export async function mergeGuestDeviceIntoAccount(
  deviceOpenId: string,
  receiverUserId: number,
  ip?: string
): Promise<MergeResult> {
  const [donorRows] = await db.execute(
    'SELECT id, email, merged_into_user_id FROM users WHERE openId = ?',
    [deviceOpenId]
  ) as any[];
  const donor = (donorRows as any[])[0];

  if (!donor) return { merged: false, reason: 'donor_not_found' };
  if (donor.id === receiverUserId) return { merged: false, reason: 'noop_same_user' };

  // Déjà fusionné précédemment (idempotence) — que ce soit vers ce même compte ou
  // un autre : dans les deux cas, rien à refaire ici, on n'annule jamais une fusion.
  if (donor.merged_into_user_id) {
    return { merged: false, reason: 'already_merged_elsewhere' };
  }

  // Sécurité absolue : ne JAMAIS fusionner deux vrais comptes (email présent des
  // deux côtés). Le device est déjà lié à un autre compte réel — situation qui
  // nécessite une action manuelle/support, pas une fusion automatique silencieuse.
  if (donor.email) {
    return { merged: false, reason: 'donor_has_account' };
  }

  const donorId = donor.id as number;
  // Ordre déterministe (id croissant) pour les verrous FOR UPDATE — évite tout
  // deadlock si deux fusions concurrentes touchent les mêmes deux lignes.
  const [lowId, highId] = donorId < receiverUserId ? [donorId, receiverUserId] : [receiverUserId, donorId];

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Verrouille les deux lignes users dans un ordre fixe.
    await conn.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [lowId]);
    await conn.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [highId]);

    // Re-vérifie sous verrou que le donor n'a pas été fusionné entre-temps
    // (course entre deux logins/refresh concurrents sur le même device).
    const [recheck] = await conn.execute(
      'SELECT merged_into_user_id, email FROM users WHERE id = ? FOR UPDATE',
      [donorId]
    ) as any[];
    const donorNow = (recheck as any[])[0];
    if (!donorNow || donorNow.merged_into_user_id || donorNow.email) {
      await conn.rollback();
      return { merged: false, reason: donorNow?.email ? 'donor_has_account' : 'already_merged_elsewhere' };
    }

    // S'assure que le wallet du compte receveur existe (idempotent, comme dans completeMission).
    await conn.execute(
      `INSERT INTO civic_wallets (user_id, available_balance, total_earned, trust_score)
       VALUES (?, 0, 0, 42) ON DUPLICATE KEY UPDATE user_id = user_id`,
      [receiverUserId]
    );

    const [donorWalletRows] = await conn.execute(
      'SELECT * FROM civic_wallets WHERE user_id = ? FOR UPDATE',
      [donorId]
    ) as any[];
    const donorWallet = (donorWalletRows as any[])[0];

    let creditsTransferred = 0;
    let missionsReattached = 0;
    let missionsDeduped = 0;

    if (donorWallet) {
      // --- Missions : ré-attache les missions du donor au receveur, SAUF si le
      // receveur a déjà validé la même mission (dédoublonnage — pas de double crédit).
      const [donorMissions] = await conn.execute(
        'SELECT id, mission_id FROM mission_completions WHERE user_id = ? FOR UPDATE',
        [donorId]
      ) as any[];

      let dedupedRewardTotal = 0;
      for (const dm of donorMissions as any[]) {
        const [existingOnReceiver] = await conn.execute(
          'SELECT id FROM mission_completions WHERE mission_id = ? AND user_id = ?',
          [dm.mission_id, receiverUserId]
        ) as any[];

        if ((existingOnReceiver as any[]).length > 0) {
          // Le receveur a déjà cette mission — on retire la ligne du donor (pas de
          // 2e crédit pour la même mission) et on soustraira sa récompense du
          // montant transféré plus bas.
          const [missionRow] = await conn.execute(
            'SELECT reward_amount FROM missions WHERE id = ?', [dm.mission_id]
          ) as any[];
          dedupedRewardTotal += Number((missionRow as any[])[0]?.reward_amount || 0);
          await conn.execute('DELETE FROM mission_completions WHERE id = ?', [dm.id]);
          missionsDeduped++;
        } else {
          await conn.execute(
            'UPDATE mission_completions SET user_id = ? WHERE id = ?',
            [receiverUserId, dm.id]
          );
          missionsReattached++;
        }
      }

      // --- Transactions : historique intégralement ré-attaché, rien n'est supprimé.
      await conn.execute(
        'UPDATE civic_transactions SET user_id = ? WHERE user_id = ?',
        [receiverUserId, donorId]
      );

      // --- Solde : additionné, moins la valeur des missions dédoublonnées (déjà
      // comptées côté receveur, jamais deux fois).
      const netAvailable = Math.max(0, Number(donorWallet.available_balance) - dedupedRewardTotal);
      const netEarned = Math.max(0, Number(donorWallet.total_earned) - dedupedRewardTotal);
      creditsTransferred = netAvailable;

      if (netAvailable > 0 || netEarned > 0 || Number(donorWallet.total_spent) > 0) {
        await conn.execute(
          `UPDATE civic_wallets SET
             available_balance = available_balance + ?,
             total_earned = total_earned + ?,
             total_spent = total_spent + ?
           WHERE user_id = ?`,
          [netAvailable, netEarned, Number(donorWallet.total_spent) || 0, receiverUserId]
        );
      }

      if (netAvailable > 0) {
        await conn.execute(
          `INSERT INTO civic_transactions (user_id, type, amount, label)
           VALUES (?, 'bonus', ?, '🔄 Fusion wallet invité (appareil) — solde transféré')`,
          [receiverUserId, netAvailable]
        );
      }
      if (missionsDeduped > 0) {
        await conn.execute(
          `INSERT INTO civic_transactions (user_id, type, amount, label)
           VALUES (?, 'bonus', 0, ?)`,
          [receiverUserId, `🔄 Fusion — ${missionsDeduped} mission(s) déjà validée(s) ignorée(s) (anti-doublon)`]
        );
      }

      // Le wallet donor est vidé (tout a été transféré ou volontairement écarté).
      await conn.execute('DELETE FROM civic_wallets WHERE user_id = ?', [donorId]);
    }

    // Le donor n'est jamais supprimé — marqué fusionné + désactivé pour l'audit.
    await conn.execute(
      'UPDATE users SET merged_into_user_id = ?, is_active = 0 WHERE id = ?',
      [receiverUserId, donorId]
    );

    await conn.commit();

    await logAudit(
      receiverUserId, 'wallet_merged', 'user', String(donorId),
      { donorId, receiverUserId, creditsTransferred, missionsReattached, missionsDeduped },
      ip
    );

    return { merged: true, reason: 'ok', creditsTransferred, missionsReattached, missionsDeduped };
  } catch (e) {
    await conn.rollback();
    console.error('[walletMerge] échec fusion, rollback:', (e as Error).message);
    return { merged: false };
  } finally {
    conn.release();
  }
}
