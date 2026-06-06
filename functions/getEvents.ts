// © 2026 Js-Innov.IA — Julien Pagin. Tous droits réservés.
// VilleConnect OS — Backend Function: getEvents
// Récupère la liste des événements depuis Railway + fallback mock

const RAILWAY_BACKEND = "https://villeconnect-production.up.railway.app";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const url = new URL(req.url);
  const postal_code = url.searchParams.get("postal_code") || "7370";
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const status = url.searchParams.get("status") || "approved";

  try {
    // Tenter Railway
    const railwayRes = await fetch(
      `${RAILWAY_BACKEND}/api/events?postal_code=${postal_code}&limit=${limit}&status=${status}`,
      { headers: { "Content-Type": "application/json" } }
    );

    if (railwayRes.ok) {
      const data = await railwayRes.json();
      return Response.json(data, {
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }
  } catch (err) {
    console.error("Railway fetch error:", err);
  }

  // Fallback: données de démonstration enrichies
  const fallbackEvents = [
    {
      id: "demo-1",
      ref: "VC-2026-11001",
      title: "Fête de la Musique — Dour",
      description: "Grande fête musicale en plein air avec 12 artistes locaux.",
      category: "Musique",
      date_start: "2026-06-21",
      time_start: "14:00",
      time_end: "23:00",
      location: "Grand-Place de Dour",
      postal_code: "7370",
      city: "Dour",
      organizer: "Ville de Dour",
      is_free: true,
      price: null,
      status: "approved",
      tags: ["musique", "été", "famille"],
      image_url: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600",
      emoji: "🎵",
    },
    {
      id: "demo-2",
      ref: "VC-2026-11002",
      title: "Marché de Producteurs",
      description: "Produits frais locaux, artisanat belge et animations enfants.",
      category: "Commerce",
      date_start: "2026-06-13",
      time_start: "08:00",
      time_end: "13:00",
      location: "Rue Haute, Dour",
      postal_code: "7370",
      city: "Dour",
      organizer: "Association des Commerçants",
      is_free: true,
      price: null,
      status: "approved",
      tags: ["marché", "local", "bio"],
      image_url: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600",
      emoji: "🥦",
    },
    {
      id: "demo-3",
      ref: "VC-2026-11003",
      title: "Tournoi de Football Amateur",
      description: "5ème édition du tournoi inter-communes. 8 équipes participants.",
      category: "Sport",
      date_start: "2026-06-20",
      time_start: "10:00",
      time_end: "18:00",
      location: "Stade Communal de Dour",
      postal_code: "7370",
      city: "Dour",
      organizer: "R.F.C. Dour",
      is_free: false,
      price: "3",
      status: "approved",
      tags: ["football", "sport", "compétition"],
      image_url: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600",
      emoji: "⚽",
    },
  ];

  return Response.json(
    { events: fallbackEvents, source: "fallback", total: fallbackEvents.length },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
});
