import { relations } from "drizzle-orm";
import {
  users, shops, shopProducts, garages, garageServices,
  events, eventReminders, dciRequests, dciOffers,
  communalAlerts, appointments, pushTokens,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  shops:          many(shops),
  garages:        many(garages),
  events:         many(events),
  dciRequests:    many(dciRequests),
  eventReminders: many(eventReminders),
  appointments:   many(appointments),
  pushTokens:     many(pushTokens),
}));

export const shopsRelations = relations(shops, ({ one, many }) => ({
  owner:       one(users, { fields: [shops.ownerId], references: [users.id] }),
  products:    many(shopProducts),
  dciOffers:   many(dciOffers),
  appointments: many(appointments),
}));

export const shopProductsRelations = relations(shopProducts, ({ one }) => ({
  shop: one(shops, { fields: [shopProducts.shopId], references: [shops.id] }),
}));

export const garagesRelations = relations(garages, ({ one, many }) => ({
  owner:        one(users, { fields: [garages.ownerId], references: [users.id] }),
  services:     many(garageServices),
  dciOffers:    many(dciOffers),
  appointments: many(appointments),
}));

export const garageServicesRelations = relations(garageServices, ({ one }) => ({
  garage: one(garages, { fields: [garageServices.garageId], references: [garages.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organizer: one(users, { fields: [events.organizerId], references: [users.id] }),
  reminders: many(eventReminders),
}));

export const eventRemindersRelations = relations(eventReminders, ({ one }) => ({
  user:  one(users, { fields: [eventReminders.userId], references: [users.id] }),
  event: one(events, { fields: [eventReminders.eventId], references: [events.id] }),
}));

export const dciRequestsRelations = relations(dciRequests, ({ one, many }) => ({
  user:   one(users, { fields: [dciRequests.userId], references: [users.id] }),
  offers: many(dciOffers),
}));

export const dciOffersRelations = relations(dciOffers, ({ one }) => ({
  request: one(dciRequests, { fields: [dciOffers.requestId], references: [dciRequests.id] }),
  shop:    one(shops,   { fields: [dciOffers.shopId],    references: [shops.id] }),
  garage:  one(garages, { fields: [dciOffers.garageId],  references: [garages.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  user:   one(users,   { fields: [appointments.userId],   references: [users.id] }),
  shop:   one(shops,   { fields: [appointments.shopId],   references: [shops.id] }),
  garage: one(garages, { fields: [appointments.garageId], references: [garages.id] }),
}));

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  user: one(users, { fields: [pushTokens.userId], references: [users.id] }),
}));
