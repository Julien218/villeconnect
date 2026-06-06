// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Backend Function: joinWaitlist
// Inscription à la liste d'attente de l'app "Ma Commune"

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req: Request) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // GET → compter les inscrits
  if (req.method === "GET") {
    try {
      const base44 = createClientFromRequest(req);
      const records = await base44.asServiceRole.entities.Waitlist.list();
      return Response.json(
        { count: records.length },
        { headers: { ...cors, "Content-Type": "application/json" } }
      );
    } catch (err) {
      return Response.json({ count: 0 }, { headers: cors });
    }
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });
  }

  try {
    const body = await req.json();
    const { email, postal_code, city, role, source } = body;

    if (!email || !email.includes("@")) {
      return Response.json(
        { error: "Email invalide" },
        { status: 400, headers: cors }
      );
    }

    const base44 = createClientFromRequest(req);

    // Vérifier si email déjà inscrit
    const existing = await base44.asServiceRole.entities.Waitlist.filter({ email });
    if (existing && existing.length > 0) {
      return Response.json(
        { success: true, already: true, message: "Déjà inscrit !" },
        { headers: cors }
      );
    }

    // Créer l'inscription
    const record = await base44.asServiceRole.entities.Waitlist.create({
      email: email.toLowerCase().trim(),
      postal_code: postal_code || "7370",
      city: city || "Dour",
      role: role || "citoyen",
      source: source || "landing",
      confirmed: false,
    });

    // Compter le total
    const all = await base44.asServiceRole.entities.Waitlist.list();

    return Response.json(
      {
        success: true,
        already: false,
        id: record.id,
        position: all.length,
        message: `Bienvenue ! Vous êtes le n°${all.length} sur la liste.`,
      },
      { headers: cors }
    );
  } catch (err) {
    console.error("joinWaitlist error:", err);
    return Response.json(
      { error: "Erreur serveur", details: String(err) },
      { status: 500, headers: cors }
    );
  }
});
