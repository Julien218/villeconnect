// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// Organisateurs d'événements : ASBL, commune, commerces. Un compte réel est rattaché à une fiche
// organisateur ; seule l'administration peut créer la fiche et la marquer « de confiance ».
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { adminProcedure, protectedProcedure, router } from '../trpc';
import { db } from '../db';

const organizerType = z.enum(['asbl', 'commune', 'commerce', 'autre']);

export const organizersRouter = router({
  // Fiche organisateur du compte connecté (ou null s'il n'en a pas).
  mine: protectedProcedure.query(async ({ ctx }) => {
    const [rows] = await db.execute(
      `SELECT id, name, organizer_type AS organizerType, postal_code AS postalCode,
              trusted, is_active AS isActive
       FROM event_organizers WHERE user_id = ? LIMIT 1`,
      [ctx.user.id]
    ) as any[];
    const row = (rows as any[])[0];
    return row
      ? { ...row, trusted: Boolean(row.trusted), isActive: Boolean(row.isActive) }
      : null;
  }),

  // Création ou mise à jour d'une fiche par l'administration, à partir de l'email du compte.
  adminUpsert: adminProcedure
    .input(z.object({
      userEmail: z.string().trim().email().max(190),
      name: z.string().trim().min(2).max(190),
      type: organizerType.default('asbl'),
      postalCode: z.string().trim().min(3).max(12).default('7370'),
      trusted: z.boolean().default(false),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const [users] = await db.execute(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [input.userEmail.toLowerCase()]
      ) as any[];
      const target = (users as any[])[0];
      if (!target) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Aucun compte avec cet email : l’organisateur doit d’abord créer son compte.',
        });
      }

      await db.execute(
        `INSERT INTO event_organizers
           (user_id, name, organizer_type, postal_code, trusted, is_active, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name), organizer_type = VALUES(organizer_type),
           postal_code = VALUES(postal_code), trusted = VALUES(trusted),
           is_active = VALUES(is_active)`,
        [
          target.id, input.name, input.type, input.postalCode,
          input.trusted ? 1 : 0, input.isActive ? 1 : 0, ctx.user.id,
        ]
      );
      return { success: true, userId: Number(target.id) };
    }),

  adminList: adminProcedure
    .input(z.object({ postalCode: z.string().trim().min(3).max(12).default('7370') }))
    .query(async ({ input }) => {
      const [rows] = await db.execute(
        `SELECT o.id, o.name, o.organizer_type AS organizerType, o.postal_code AS postalCode,
                o.trusted, o.is_active AS isActive, u.email
         FROM event_organizers o JOIN users u ON u.id = o.user_id
         WHERE o.postal_code = ? ORDER BY o.name ASC LIMIT 200`,
        [input.postalCode]
      ) as any[];
      return rows;
    }),
});
