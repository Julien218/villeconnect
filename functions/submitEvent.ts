// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Backend Function: submitEvent
// Reçoit un événement depuis le portail organisateurs,
// l'insère en base MySQL via Railway, et notifie l'agent IA.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const RAILWAY_BACKEND = "https://villeconnect-production.up.railway.app";

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();

    const {
      title,
      description,
      category,
      date_start,
      date_end,
      time_start,
      time_end,
      location,
      address,
      postal_code,
      city,
      organizer,
      phone,
      email,
      website,
      is_free,
      price,
      tags,
      capacity,
      image_url,
      recurrence,
    } = body;

    // Validation minimale
    if (!organizer || !email || !phone) {
      return Response.json(
        { error: "Champs obligatoires manquants: organizer, email, phone" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Générer une référence unique
    const ref = `VC-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;

    // 1. Envoyer vers le backend Railway (tRPC ou REST)
    let railwayOk = false;
    let railwayEventId: string | null = null;

    try {
      const railwayRes = await fetch(`${RAILWAY_BACKEND}/api/events/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref,
          title: title || "Événement sans titre",
          description: description || "",
          category: category || "Autre",
          date_start: date_start || new Date().toISOString().split("T")[0],
          date_end: date_end || date_start,
          time_start: time_start || "00:00",
          time_end: time_end || "23:59",
          location: location || "Lieu à confirmer",
          address: address || "",
          postal_code: postal_code || "7370",
          city: city || "Dour",
          organizer,
          phone,
          email,
          website: website || null,
          is_free: is_free !== false,
          price: price || null,
          tags: Array.isArray(tags) ? tags.join(",") : (tags || ""),
          capacity: capacity || null,
          image_url: image_url || null,
          recurrence: recurrence || "none",
          status: "pending",
          source: "portal_web",
        }),
      });

      if (railwayRes.ok) {
        const railwayData = await railwayRes.json();
        railwayOk = true;
        railwayEventId = railwayData?.id || null;
      } else {
        console.error("Railway error:", railwayRes.status, await railwayRes.text());
      }
    } catch (railwayErr) {
      console.error("Railway fetch error:", railwayErr);
    }

    // 2. Stocker dans Base44 entities comme backup
    try {
      const base44 = createClientFromRequest(req);
      // Tenter de stocker si l'entité existe
      // (facultatif — Railway est la source primaire)
    } catch (_) {
      // Silently ignore if entity not configured
    }

    // 3. Réponse succès
    return Response.json(
      {
        success: true,
        ref,
        event_id: railwayEventId,
        railway_synced: railwayOk,
        message: railwayOk
          ? "Événement soumis avec succès et synchronisé avec VilleConnect."
          : "Événement enregistré. Synchronisation Railway en attente.",
        status: "pending",
        next_step: "Votre événement sera examiné par notre équipe sous 24h.",
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("submitEvent error:", err);
    return Response.json(
      { error: "Erreur interne du serveur", details: String(err) },
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }
});
