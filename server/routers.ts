import { z } from "zod";
import { eq, desc, like, and, gte } from "drizzle-orm";

import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  shops, shopProducts, garages, garageServices,
  events, eventReminders, dciRequests, dciOffers,
  communalAlerts, appointments, pushTokens,
} from "../drizzle/schema";

// ─── Auth Router ──────────────────────────────────────────────────────────────

const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});

// ─── Shops Router ─────────────────────────────────────────────────────────────

const shopsRouter = router({
  list: publicProcedure
    .input(z.object({ postalCode: z.string().optional(), category: z.string().optional(), search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(shops.isActive, true)];
      if (input?.postalCode) conditions.push(eq(shops.postalCode, input.postalCode));
      if (input?.category)   conditions.push(eq(shops.category, input.category));
      const rows = await db.select().from(shops).where(and(...conditions)).orderBy(desc(shops.rating));
      return rows;
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(shops).where(eq(shops.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  products: publicProcedure
    .input(z.object({ shopId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(shopProducts).where(and(eq(shopProducts.shopId, input.shopId), eq(shopProducts.isAvailable, true)));
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      category: z.string(),
      description: z.string().optional(),
      address: z.string().optional(),
      postalCode: z.string().length(4).optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      hours: z.string().optional(),
      imageUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const result = await db.insert(shops).values({ ...input, ownerId: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: z.record(z.unknown()) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.update(shops).set(input.data as any).where(and(eq(shops.id, input.id), eq(shops.ownerId, ctx.user.id)));
      return { success: true };
    }),
});

// ─── Garages Router ───────────────────────────────────────────────────────────

const garagesRouter = router({
  list: publicProcedure
    .input(z.object({ postalCode: z.string().optional(), specialty: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(garages.isActive, true)];
      if (input?.postalCode) conditions.push(eq(garages.postalCode, input.postalCode));
      if (input?.specialty)  conditions.push(eq(garages.specialty, input.specialty));
      return db.select().from(garages).where(and(...conditions)).orderBy(desc(garages.rating));
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(garages).where(eq(garages.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  services: publicProcedure
    .input(z.object({ garageId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(garageServices).where(eq(garageServices.garageId, input.garageId));
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      specialty: z.string().optional(),
      description: z.string().optional(),
      address: z.string().optional(),
      postalCode: z.string().length(4).optional(),
      city: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      hours: z.string().optional(),
      imageUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const result = await db.insert(garages).values({ ...input, ownerId: ctx.user.id });
      return { id: Number(result[0].insertId) };
    }),
});

// ─── Events Router ────────────────────────────────────────────────────────────

const eventsRouter = router({
  list: publicProcedure
    .input(z.object({ postalCode: z.string().optional(), category: z.string().optional(), upcoming: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(events.status, "approved"), eq(events.isActive, true)];
      if (input?.postalCode) conditions.push(eq(events.postalCode, input.postalCode));
      if (input?.category)   conditions.push(eq(events.category, input.category as any));
      if (input?.upcoming)   conditions.push(gte(events.dateStart, new Date()));
      return db.select().from(events).where(and(...conditions)).orderBy(events.dateStart);
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(events).where(eq(events.id, input.id)).limit(1);
      return rows[0] ?? null;
    }),

  submit: publicProcedure
    .input(z.object({
      title: z.string().min(3),
      description: z.string().min(10),
      category: z.enum(["Culture","Sport","Marché","Jeunesse","Environnement","Communal","Autre"]),
      dateStart: z.string(),
      dateEnd: z.string().optional(),
      timeLabel: z.string().optional(),
      location: z.string(),
      address: z.string().optional(),
      postalCode: z.string().length(4).optional(),
      city: z.string().optional(),
      imageUrl: z.string().url().optional(),
      isFree: z.boolean().default(true),
      price: z.number().optional(),
      priceInfo: z.string().optional(),
      organizer: z.string(),
      organizerPhone: z.string().optional(),
      organizerEmail: z.string().email(),
      tags: z.array(z.string()).optional(),
      capacity: z.number().optional(),
      registrationRequired: z.enum(["non","recommande","obligatoire"]).optional(),
      audience: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const tagsStr = input.tags ? JSON.stringify(input.tags) : null;
      const result = await db.insert(events).values({
        ...input,
        dateStart: new Date(input.dateStart),
        dateEnd: input.dateEnd ? new Date(input.dateEnd) : undefined,
        tags: tagsStr,
        organizerId: ctx?.user?.id ?? null,
        status: "pending",
      });
      return { id: Number(result[0].insertId), ref: `VC-${new Date().getFullYear()}-${String(result[0].insertId).padStart(5,'0')}` };
    }),

  remind: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(eventReminders).values({ userId: ctx.user.id, eventId: input.eventId });
      return { success: true };
    }),

  myReminders: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(eventReminders).where(eq(eventReminders.userId, ctx.user.id));
  }),
});

// ─── DCI Router ───────────────────────────────────────────────────────────────

const dciRouter = router({
  submit: protectedProcedure
    .input(z.object({
      description: z.string().min(10),
      postalCode: z.string().length(4).optional(),
      city: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const result = await db.insert(dciRequests).values({ ...input, userId: ctx.user.id, status: "pending" });
      return { id: Number(result[0].insertId) };
    }),

  myRequests: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(dciRequests).where(eq(dciRequests.userId, ctx.user.id)).orderBy(desc(dciRequests.createdAt));
  }),

  offers: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(dciOffers).where(eq(dciOffers.requestId, input.requestId));
    }),

  submitOffer: protectedProcedure
    .input(z.object({
      requestId: z.number(),
      message: z.string().min(5),
      price: z.number().optional(),
      shopId: z.number().optional(),
      garageId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const result = await db.insert(dciOffers).values({ ...input, status: "pending" });
      return { id: Number(result[0].insertId) };
    }),
});

// ─── Communal Router ──────────────────────────────────────────────────────────

const communalRouter = router({
  alerts: publicProcedure
    .input(z.object({ postalCode: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions = [eq(communalAlerts.isActive, true)];
      if (input?.postalCode) conditions.push(eq(communalAlerts.postalCode, input.postalCode));
      return db.select().from(communalAlerts).where(and(...conditions)).orderBy(desc(communalAlerts.createdAt));
    }),
});

// ─── Notifications Router ─────────────────────────────────────────────────────

const notificationsRouter = router({
  registerToken: protectedProcedure
    .input(z.object({
      token: z.string(),
      platform: z.enum(["ios","android","web"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      await db.insert(pushTokens)
        .values({ ...input, userId: ctx.user.id, isActive: true })
        .onDuplicateKeyUpdate({ set: { isActive: true, userId: ctx.user.id } });
      return { success: true };
    }),
});

// ─── Appointments Router ──────────────────────────────────────────────────────

const appointmentsRouter = router({
  create: protectedProcedure
    .input(z.object({
      shopId: z.number().optional(),
      garageId: z.number().optional(),
      date: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");
      const result = await db.insert(appointments).values({
        ...input,
        date: new Date(input.date),
        userId: ctx.user.id,
        status: "pending",
      });
      return { id: Number(result[0].insertId) };
    }),

  myAppointments: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(appointments).where(eq(appointments.userId, ctx.user.id)).orderBy(desc(appointments.date));
  }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system:        systemRouter,
  auth:          authRouter,
  shops:         shopsRouter,
  garages:       garagesRouter,
  events:        eventsRouter,
  dci:           dciRouter,
  communal:      communalRouter,
  notifications: notificationsRouter,
  appointments:  appointmentsRouter,
});

export type AppRouter = typeof appRouter;
