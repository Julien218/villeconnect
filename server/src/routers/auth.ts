// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { router, publicProcedure } from '../trpc';
import { getOrCreateUserId } from '../lib/users';

// Émet un token signé pour l'identité anonyme du device (openId déjà généré et stocké
// côté client, utilisé jusqu'ici en clair pour le wallet). Ne remplace PAS une vraie
// authentification (email/mot de passe) — c'est le minimum nécessaire pour que les
// routes sensibles (protectedProcedure) puissent vérifier une identité côté serveur
// au lieu de faire confiance à un openId envoyé tel quel par le client.
export const authRouter = router({
  deviceLogin: publicProcedure
    .input(z.object({ openId: z.string().min(8).max(128), postalCode: z.string().optional() }))
    .mutation(async ({ input }) => {
      const { id, role } = await getOrCreateUserId(input.openId, input.postalCode);
      const token = jwt.sign(
        { sub: id, openId: input.openId, role },
        process.env.JWT_SECRET as string,
        { expiresIn: '30d' }
      );
      return { token, role };
    }),
});
