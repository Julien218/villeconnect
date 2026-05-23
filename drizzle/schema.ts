import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id:            int("id").autoincrement().primaryKey(),
  openId:        varchar("openId", { length: 64 }).notNull().unique(),
  name:          text("name"),
  email:         varchar("email", { length: 320 }),
  loginMethod:   varchar("loginMethod", { length: 64 }),
  role:          mysqlEnum("role", ["user", "admin", "pro", "commune"]).default("user").notNull(),
  // Belgian postal code → city resolution
  postalCode:    varchar("postalCode", { length: 4 }),
  city:          varchar("city", { length: 128 }),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn:  timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User      = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Shops (Vitrines commerçantes) ───────────────────────────────────────────

export const shops = mysqlTable("shops", {
  id:            int("id").autoincrement().primaryKey(),
  ownerId:       int("ownerId").references(() => users.id),
  name:          varchar("name", { length: 255 }).notNull(),
  category:      varchar("category", { length: 64 }).notNull(),
  description:   text("description"),
  address:       varchar("address", { length: 512 }),
  postalCode:    varchar("postalCode", { length: 4 }),
  city:          varchar("city", { length: 128 }),
  phone:         varchar("phone", { length: 32 }),
  email:         varchar("email", { length: 320 }),
  website:       varchar("website", { length: 512 }),
  hours:         text("hours"),
  imageUrl:      varchar("imageUrl", { length: 1024 }),
  rating:        decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  hasPromotion:  boolean("hasPromotion").default(false),
  promotionText: varchar("promotionText", { length: 512 }),
  isActive:      boolean("isActive").default(true),
  createdAt:     timestamp("createdAt").defaultNow().notNull(),
  updatedAt:     timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shop      = typeof shops.$inferSelect;
export type InsertShop = typeof shops.$inferInsert;

// ─── Shop Products ────────────────────────────────────────────────────────────

export const shopProducts = mysqlTable("shop_products", {
  id:          int("id").autoincrement().primaryKey(),
  shopId:      int("shopId").references(() => shops.id).notNull(),
  name:        varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price:       decimal("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl:    varchar("imageUrl", { length: 1024 }),
  isAvailable: boolean("isAvailable").default(true),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShopProduct      = typeof shopProducts.$inferSelect;
export type InsertShopProduct = typeof shopProducts.$inferInsert;

// ─── Garages & Artisans ───────────────────────────────────────────────────────

export const garages = mysqlTable("garages", {
  id:          int("id").autoincrement().primaryKey(),
  ownerId:     int("ownerId").references(() => users.id),
  name:        varchar("name", { length: 255 }).notNull(),
  specialty:   varchar("specialty", { length: 128 }),
  description: text("description"),
  address:     varchar("address", { length: 512 }),
  postalCode:  varchar("postalCode", { length: 4 }),
  city:        varchar("city", { length: 128 }),
  phone:       varchar("phone", { length: 32 }),
  email:       varchar("email", { length: 320 }),
  hours:       text("hours"),
  imageUrl:    varchar("imageUrl", { length: 1024 }),
  rating:      decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  isActive:    boolean("isActive").default(true),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Garage      = typeof garages.$inferSelect;
export type InsertGarage = typeof garages.$inferInsert;

// ─── Garage Services ──────────────────────────────────────────────────────────

export const garageServices = mysqlTable("garage_services", {
  id:        int("id").autoincrement().primaryKey(),
  garageId:  int("garageId").references(() => garages.id).notNull(),
  name:      varchar("name", { length: 255 }).notNull(),
  price:     decimal("price", { precision: 10, scale: 2 }),
  duration:  varchar("duration", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GarageService      = typeof garageServices.$inferSelect;
export type InsertGarageService = typeof garageServices.$inferInsert;

// ─── Events (Activités) ───────────────────────────────────────────────────────

export const events = mysqlTable("events", {
  id:           int("id").autoincrement().primaryKey(),
  organizerId:  int("organizerId").references(() => users.id),
  title:        varchar("title", { length: 512 }).notNull(),
  description:  text("description"),
  category:     mysqlEnum("category", ["Culture","Sport","Marché","Jeunesse","Environnement","Communal","Autre"]).notNull(),
  dateStart:    timestamp("dateStart").notNull(),
  dateEnd:      timestamp("dateEnd"),
  timeLabel:    varchar("timeLabel", { length: 64 }),
  location:     varchar("location", { length: 255 }),
  address:      varchar("address", { length: 512 }),
  postalCode:   varchar("postalCode", { length: 4 }),
  city:         varchar("city", { length: 128 }),
  imageUrl:     varchar("imageUrl", { length: 1024 }),
  isFree:       boolean("isFree").default(true),
  price:        decimal("price", { precision: 10, scale: 2 }),
  priceInfo:    varchar("priceInfo", { length: 255 }),
  organizer:    varchar("organizer", { length: 255 }),
  organizerPhone: varchar("organizerPhone", { length: 32 }),
  organizerEmail: varchar("organizerEmail", { length: 320 }),
  tags:         text("tags"),  // JSON array stored as text
  capacity:     int("capacity"),
  registrationRequired: mysqlEnum("registrationRequired", ["non","recommande","obligatoire"]).default("non"),
  audience:     varchar("audience", { length: 128 }),
  status:       mysqlEnum("status", ["pending","approved","rejected","cancelled"]).default("pending"),
  isActive:     boolean("isActive").default(true),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event      = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ─── Event Reminders ──────────────────────────────────────────────────────────

export const eventReminders = mysqlTable("event_reminders", {
  id:        int("id").autoincrement().primaryKey(),
  userId:    int("userId").references(() => users.id).notNull(),
  eventId:   int("eventId").references(() => events.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EventReminder      = typeof eventReminders.$inferSelect;
export type InsertEventReminder = typeof eventReminders.$inferInsert;

// ─── DCI (Démarche Citoyenne Intelligente) ────────────────────────────────────

export const dciRequests = mysqlTable("dci_requests", {
  id:          int("id").autoincrement().primaryKey(),
  userId:      int("userId").references(() => users.id),
  description: text("description").notNull(),
  category:    varchar("category", { length: 128 }),
  status:      mysqlEnum("status", ["pending","offers","accepted","completed","cancelled"]).default("pending"),
  postalCode:  varchar("postalCode", { length: 4 }),
  city:        varchar("city", { length: 128 }),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DciRequest      = typeof dciRequests.$inferSelect;
export type InsertDciRequest = typeof dciRequests.$inferInsert;

// ─── DCI Offers (réponses des pros) ──────────────────────────────────────────

export const dciOffers = mysqlTable("dci_offers", {
  id:          int("id").autoincrement().primaryKey(),
  requestId:   int("requestId").references(() => dciRequests.id).notNull(),
  shopId:      int("shopId").references(() => shops.id),
  garageId:    int("garageId").references(() => garages.id),
  message:     text("message").notNull(),
  price:       decimal("price", { precision: 10, scale: 2 }),
  status:      mysqlEnum("status", ["pending","accepted","rejected"]).default("pending"),
  createdAt:   timestamp("createdAt").defaultNow().notNull(),
  updatedAt:   timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DciOffer      = typeof dciOffers.$inferSelect;
export type InsertDciOffer = typeof dciOffers.$inferInsert;

// ─── Communal Alerts ──────────────────────────────────────────────────────────

export const communalAlerts = mysqlTable("communal_alerts", {
  id:         int("id").autoincrement().primaryKey(),
  title:      varchar("title", { length: 512 }).notNull(),
  message:    text("message").notNull(),
  type:       mysqlEnum("type", ["info","warning","urgent"]).default("info"),
  postalCode: varchar("postalCode", { length: 4 }),
  city:       varchar("city", { length: 128 }),
  expiresAt:  timestamp("expiresAt"),
  isActive:   boolean("isActive").default(true),
  createdAt:  timestamp("createdAt").defaultNow().notNull(),
  updatedAt:  timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CommunalAlert      = typeof communalAlerts.$inferSelect;
export type InsertCommunalAlert = typeof communalAlerts.$inferInsert;

// ─── Appointments ─────────────────────────────────────────────────────────────

export const appointments = mysqlTable("appointments", {
  id:        int("id").autoincrement().primaryKey(),
  userId:    int("userId").references(() => users.id).notNull(),
  shopId:    int("shopId").references(() => shops.id),
  garageId:  int("garageId").references(() => garages.id),
  date:      timestamp("date").notNull(),
  notes:     text("notes"),
  status:    mysqlEnum("status", ["pending","confirmed","cancelled","completed"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment      = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ─── Push Notification Tokens ─────────────────────────────────────────────────

export const pushTokens = mysqlTable("push_tokens", {
  id:        int("id").autoincrement().primaryKey(),
  userId:    int("userId").references(() => users.id).notNull(),
  token:     varchar("token", { length: 512 }).notNull().unique(),
  platform:  mysqlEnum("platform", ["ios","android","web"]).notNull(),
  isActive:  boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PushToken      = typeof pushTokens.$inferSelect;
export type InsertPushToken = typeof pushTokens.$inferInsert;

// ─── Belgian Postal Codes (lookup) ────────────────────────────────────────────

export const postalCodes = mysqlTable("postal_codes", {
  id:         int("id").autoincrement().primaryKey(),
  code:       varchar("code", { length: 4 }).notNull().unique(),
  cityFr:     varchar("cityFr", { length: 128 }).notNull(),
  cityNl:     varchar("cityNl", { length: 128 }),
  province:   varchar("province", { length: 128 }),
  region:     mysqlEnum("region", ["Wallonie","Flandre","Bruxelles"]),
});

export type PostalCode      = typeof postalCodes.$inferSelect;
export type InsertPostalCode = typeof postalCodes.$inferInsert;
