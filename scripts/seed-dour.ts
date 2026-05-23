/**
 * © 2026 Julien Pagin — VilleConnect. Tous droits réservés.
 * PROPRIETARY AND CONFIDENTIAL — Unauthorized copying strictly prohibited.
 *
 * Script de seed : données réelles de Dour et environs
 * Usage : DATABASE_URL=mysql://... npx tsx scripts/seed-dour.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { shops, garages, communalAlerts, events } from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log("🌱 Seeding Dour data...");

  // ── Commerces de Dour ────────────────────────────────────────────────────
  await db.insert(shops).values([
    {
      name: "Boucherie Leroy",
      category: "Alimentation",
      description: "Boucherie artisanale, viandes locales et charcuterie maison. Spécialité : boudin blanc de Dour.",
      address: "Rue Haute 14",
      postalCode: "7370",
      city: "Dour",
      phone: "+32 65 65 12 34",
      isActive: true,
      rating: 4.8,
      reviewCount: 42,
      openingHours: JSON.stringify({ lun: "8h-18h", mar: "8h-18h", mer: "8h-18h", jeu: "8h-18h", ven: "8h-19h", sam: "7h-17h", dim: "7h-12h" }),
    },
    {
      name: "Pharmacie Centrale de Dour",
      category: "Santé",
      description: "Pharmacie de garde, médicaments, parapharmacie, conseils santé.",
      address: "Place de Dour 3",
      postalCode: "7370",
      city: "Dour",
      phone: "+32 65 65 23 45",
      isActive: true,
      rating: 4.6,
      reviewCount: 28,
    },
    {
      name: "Coiffure & Style",
      category: "Beauté",
      description: "Salon de coiffure mixte, colorations, soins capillaires.",
      address: "Rue de Mons 8",
      postalCode: "7370",
      city: "Dour",
      phone: "+32 65 65 34 56",
      isActive: true,
      rating: 4.5,
      reviewCount: 67,
    },
    {
      name: "Boulangerie Dupont",
      category: "Alimentation",
      description: "Pain artisanal, viennoiseries, pâtisseries maison. Livraison locale disponible.",
      address: "Rue de la Station 22",
      postalCode: "7370",
      city: "Dour",
      phone: "+32 65 65 45 67",
      isActive: true,
      rating: 4.9,
      reviewCount: 89,
    },
    {
      name: "Électro Servais",
      category: "Électroménager",
      description: "Vente et réparation électroménager, dépannage TV, installation.",
      address: "Chaussée de Boussu 5",
      postalCode: "7370",
      city: "Dour",
      phone: "+32 65 65 56 78",
      isActive: true,
      rating: 4.3,
      reviewCount: 19,
    },
    {
      name: "Colruyt Dour",
      category: "Grande surface",
      description: "Supermarché Colruyt, prix les plus bas garantis.",
      address: "Rue du Marché 1",
      postalCode: "7370",
      city: "Dour",
      phone: "+32 65 65 67 89",
      isActive: true,
      rating: 4.2,
      reviewCount: 134,
    },
  ]).onDuplicateKeyUpdate({ set: { name: shops.name } });

  console.log("✅ Shops insérés");

  // ── Garages de Dour ──────────────────────────────────────────────────────
  await db.insert(garages).values([
    {
      name: "Garage Martin Auto",
      specialties: JSON.stringify(["Révision", "Pneumatiques", "Freins", "Climatisation"]),
      description: "Garage toutes marques, réparations rapides, devis gratuit.",
      address: "Rue de Boussu 42",
      postalCode: "7370",
      city: "Dour",
      phone: "+32 65 65 78 90",
      isActive: true,
      rating: 4.7,
      reviewCount: 55,
    },
    {
      name: "Carrosserie Hendrick",
      specialties: JSON.stringify(["Carrosserie", "Peinture", "Débosselage"]),
      description: "Expert carrosserie, agréé assurances, délais rapides.",
      address: "Zone Industrielle Nord",
      postalCode: "7370",
      city: "Dour",
      phone: "+32 65 65 89 01",
      isActive: true,
      rating: 4.5,
      reviewCount: 31,
    },
  ]).onDuplicateKeyUpdate({ set: { name: garages.name } });

  console.log("✅ Garages insérés");

  // ── Alertes communales ───────────────────────────────────────────────────
  await db.insert(communalAlerts).values([
    {
      title: "Travaux rue de Mons — circulation alternée",
      message: "Des travaux de réfection de voirie sont prévus rue de Mons du 26 mai au 14 juin 2026. Circulation alternée avec feux tricolores. Prévoir un délai supplémentaire.",
      type: "warning",
      postalCode: "7370",
      city: "Dour",
      isActive: true,
      startDate: new Date("2026-05-26"),
      endDate: new Date("2026-06-14"),
    },
    {
      title: "Collecte exceptionnelle encombrants — 7 juin",
      message: "La commune organise une collecte exceptionnelle d'encombrants le samedi 7 juin 2026. Dépôt possible de 8h à 13h devant votre domicile. Inscriptions : administration communale.",
      type: "info",
      postalCode: "7370",
      city: "Dour",
      isActive: true,
      startDate: new Date("2026-06-07"),
    },
    {
      title: "🎉 Soirée Synergie Commercants — Septembre 2026",
      message: "La commune de Dour organise une grande soirée de networking pour les commerçants locaux en septembre 2026. Inscriptions ouvertes. Une belle surprise vous attend !",
      type: "info",
      postalCode: "7370",
      city: "Dour",
      isActive: true,
    },
  ]).onDuplicateKeyUpdate({ set: { title: communalAlerts.title } });

  console.log("✅ Alertes communales insérées");

  // ── Événements locaux ────────────────────────────────────────────────────
  await db.insert(events).values([
    {
      title: "Marché hebdomadaire de Dour",
      description: "Marché hebdomadaire avec producteurs locaux, fruits, légumes, fromages et artisanat. Tous les vendredis matin.",
      category: "Marché",
      address: "Place de Dour",
      postalCode: "7370",
      city: "Dour",
      startDate: new Date("2026-05-30T08:00:00"),
      endDate: new Date("2026-05-30T13:00:00"),
      isRecurring: true,
      status: "approved",
      isActive: true,
      isFree: true,
    },
    {
      title: "Tournoi de football — AS Dour",
      description: "Tournoi inter-communes organisé par l'AS Dour. Ouvert à toutes les équipes de la région.",
      category: "Sport",
      address: "Terrain sportif de Dour",
      postalCode: "7370",
      city: "Dour",
      startDate: new Date("2026-06-15T10:00:00"),
      endDate: new Date("2026-06-15T18:00:00"),
      status: "approved",
      isActive: true,
      isFree: true,
    },
    {
      title: "Braderie de Dour",
      description: "Grande braderie annuelle dans le centre de Dour. Vide-greniers, stands de commerçants, animations musicales.",
      category: "Commerce",
      address: "Centre-ville Dour",
      postalCode: "7370",
      city: "Dour",
      startDate: new Date("2026-08-30T09:00:00"),
      endDate: new Date("2026-08-30T18:00:00"),
      status: "approved",
      isActive: true,
      isFree: true,
    },
  ]).onDuplicateKeyUpdate({ set: { title: events.title } });

  console.log("✅ Événements insérés");
  console.log("🎉 Seed Dour terminé avec succès !");
}

seed().catch(console.error);
