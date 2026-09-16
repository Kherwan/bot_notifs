const FIXTURE_ID = 1636341;

// Match : Sturm Graz - Rennes
// Coup d'envoi : 16 septembre 2026 à 19:00 UTC = 21:00 en France
//
// Fenêtre automatique choisie :
// 18:50 UTC = 20:50 France
// 21:20 UTC = 23:20 France

const MATCH_START_WINDOW = new Date("2026-09-16T18:50:00Z");
const MATCH_END_WINDOW = new Date("2026-09-16T21:20:00Z");


export default {

  // ============================================================
  // TEST MANUEL EN OUVRANT L'URL DU WORKER
  // ============================================================

  async fetch(request, env) {
    try {
      const result = await checkMatch(env);

      return new Response(result, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });

    } catch (error) {
      return errorResponse(error);
    }
  },


  // ============================================================
  // DÉCLENCHEMENT AUTOMATIQUE PAR LE CRON
  // ============================================================

  async scheduled(event, env, ctx) {

    const now = new Date();

    // En dehors de la fenêtre du match :
    // AUCUN appel à API-Football.
    if (
      now < MATCH_START_WINDOW ||
      now > MATCH_END_WINDOW
    ) {
      console.log(
        "Hors fenêtre du match : aucun appel API-Football."
      );
      return;
    }

    // Pendant la fenêtre du match :
    // on lance la vérification.
    ctx.waitUntil(
      checkMatch(env)
        .then(result => {
          console.log(result);
        })
        .catch(error => {
          console.error(
            error.stack || error.message || error
          );
        })
    );
  },
};


// ============================================================
// VÉRIFICATION DU MATCH
// ============================================================

async function checkMatch(env) {

  const response = await fetch(
    `https://v3.football.api-sports.io/fixtures?id=${FIXTURE_ID}`,
    {
      headers: {
        "x-apisports-key": env.API_FOOTBALL_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `API-Football HTTP ${response.status}`
    );
  }

  const data = await response.json();


  // ============================================================
  // ERREURS API-FOOTBALL
  // ============================================================

  if (
    data.errors &&
    (
      (Array.isArray(data.errors) &&
        data.errors.length > 0) ||
      (!Array.isArray(data.errors) &&
        Object.keys(data.errors).length > 0)
    )
  ) {
    throw new Error(
      `API-Football : ${JSON.stringify(data.errors)}`
    );
  }


  const match = data.response?.[0];

  if (!match) {
    throw new Error(
      "Match introuvable dans API-Football."
    );
  }


  // ============================================================
  // ÉVÉNEMENTS DU MATCH
  // ============================================================

  const events = match.events || [];

  if (events.length === 0) {
    return "ℹ️ Aucun événement dans le match pour le moment.";
  }


  // ============================================================
  // MÉMOIRE KV
  // ============================================================

  if (!env.MATCH_EVENTS) {
    throw new Error(
      "Le binding KV MATCH_EVENTS est absent."
    );
  }

  const kvKey = `fixture-${FIXTURE_ID}`;

  const savedEvents =
    (await env.MATCH_EVENTS.get(
      kvKey,
      { type: "json" }
    )) || [];

  const sentEvents = new Set(savedEvents);


  // ============================================================
  // NOUVEAUX ÉVÉNEMENTS
  // ============================================================

  const newEvents = events.filter(event => {
    const key = createEventKey(event);
    return !sentEvents.has(key);
  });

  if (newEvents.length === 0) {
    return "✅ Aucun nouvel événement à envoyer. ❤️🖤";
  }


  // ============================================================
  // ENVOI DISCORD
  // ============================================================

  let sentCount = 0;

  for (const event of newEvents) {

    const message = formatEvent(event, match);

    // Événement que nous ne souhaitons pas publier
    if (!message) {
      continue;
    }

    const discordResponse = await fetch(
      env.DISCORD_WEBHOOK_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: message,
        }),
      }
    );

    if (!discordResponse.ok) {

      const discordError =
        await discordResponse.text();

      throw new Error(
        `Discord HTTP ${discordResponse.status} : ${discordError}`
      );
    }

    sentCount++;
  }


  // ============================================================
  // SAUVEGARDE DANS KV
  // ============================================================

  // On mémorise TOUS les événements actuellement connus.
  // Au prochain passage, seuls les nouveaux seront traités.

  const allEventKeys =
    events.map(createEventKey);

  await env.MATCH_EVENTS.put(
    kvKey,
    JSON.stringify(allEventKeys)
  );


  return (
    `✅ ${sentCount} nouvel événement envoyé sur Discord. ❤️🖤`
  );
}


// ============================================================
// IDENTIFIANT UNIQUE D'UN ÉVÉNEMENT
// ============================================================

function createEventKey(event) {

  return [
    event.time?.elapsed ?? "",
    event.time?.extra ?? "",
    event.team?.id ?? "",
    event.player?.id ?? "",
    event.assist?.id ?? "",
    event.type ?? "",
    event.detail ?? "",
  ].join("-");
}


// ============================================================
// FORMATAGE DES MESSAGES DISCORD
// ============================================================

function formatEvent(event, match) {

  const teamName =
    event.team?.name || "Équipe inconnue";

  const homeName =
    match.teams?.home?.name || "Domicile";

  const awayName =
    match.teams?.away?.name || "Extérieur";

  const homeScore =
    match.goals?.home ?? 0;

  const awayScore =
    match.goals?.away ?? 0;

  const minute =
    `${event.time?.elapsed ?? "?"}'`;


  // ============================================================
  // ⚽ BUT
  // ============================================================

  if (event.type === "Goal") {

    // Penalty raté
    if (event.detail === "Missed Penalty") {

      return (
        `❌ **PENALTY RATÉ — ${teamName.toUpperCase()}**\n\n` +
        `⏱️ **${minute}**\n` +
        `👤 ${event.player?.name || "Joueur inconnu"}\n\n` +
        `🏟️ **${homeName} ${homeScore}–${awayScore} ${awayName}**`
      );
    }


    return (
      `⚽ **BUT — ${teamName.toUpperCase()} !**\n\n` +
      `⏱️ **${minute}**\n` +
      `👤 **${event.player?.name || "Buteur inconnu"}**\n` +
      `🎯 Passe décisive : ${event.assist?.name || "aucune"}\n\n` +
      `🏟️ **${homeName} ${homeScore}–${awayScore} ${awayName}**`
    );
  }


  // ============================================================
  // 🟨 / 🟥 CARTON
  // ============================================================

  if (event.type === "Card") {

    const detail =
      event.detail?.toLowerCase() || "";

    const isRed =
      detail.includes("red");

    const cardEmoji =
      isRed ? "🟥" : "🟨";

    return (
      `${cardEmoji} **CARTON — ${teamName.toUpperCase()}**\n\n` +
      `⏱️ **${minute}**\n` +
      `👤 ${event.player?.name || "Joueur inconnu"}\n` +
      `${event.detail || ""}`
    );
  }


  // ============================================================
  // 🔄 REMPLACEMENT
  // ============================================================

  if (event.type === "subst") {

    return (
      `🔄 **CHANGEMENT — ${teamName.toUpperCase()}**\n\n` +
      `⏱️ **${minute}**\n` +
      `⬆️ ${event.assist?.name || "Entrant"}\n` +
      `⬇️ ${event.player?.name || "Sortant"}`
    );
  }


  // ============================================================
  // 📺 VAR
  // ============================================================

  if (event.type === "Var") {

    return (
      `📺 **VAR — ${teamName.toUpperCase()}**\n\n` +
      `⏱️ **${minute}**\n` +
      `${event.detail || "Décision VAR"}`
    );
  }


  // Les autres événements sont ignorés.
  return null;
}


// ============================================================
// AFFICHAGE DES ERREURS LORS DU TEST MANUEL
// ============================================================

function errorResponse(error) {

  return new Response(
    `❌ ERREUR WORKER\n\n${error.stack || error.message || error}`,
    {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    }
  );
}
