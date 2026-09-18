const FIXTURE_ID = 1552768;
const RENNES_ID = 94;

// Lyon – Rennes : 19/09/2026 à 18:45 UTC = 20:45 en France
const MONITORING_START = new Date("2026-09-19T18:35:00Z");

// Sécurité : même si API-Football ne passe jamais le match en FT,
// on arrête les appels 3 heures après le coup d'envoi.
const SAFETY_STOP = new Date("2026-09-19T21:45:00Z");

const KV_EVENTS_KEY = `fixture-${FIXTURE_ID}`;
const KV_READY_KEY = `ready-${FIXTURE_ID}`;
const KV_FINISHED_KEY = `finished-${FIXTURE_ID}`;

export default {

  // Test manuel depuis l'URL du Worker.
  // IMPORTANT : il ne déclenche PAS d'appel API-Football.
  async fetch(request, env) {
    const ready = await env.MATCH_EVENTS.get(KV_READY_KEY);
    const finished = await env.MATCH_EVENTS.get(KV_FINISHED_KEY);

    return new Response(
      [
        "🤖 Roazhon Parle V3",
        "",
        `Fixture : ${FIXTURE_ID}`,
        "Match : Lyon – Rennes",
        "Coup d'envoi : 20h45",
        `Message pré-match envoyé : ${ready ? "OUI" : "NON"}`,
        `Match marqué terminé : ${finished ? "OUI" : "NON"}`,
        "",
        "✅ Worker actif. Le suivi est géré automatiquement par le Cron."
      ].join("\n"),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8"
        }
      }
    );
  },


  // Déclenché automatiquement par Cloudflare.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledCheck(env));
  }

};


async function runScheduledCheck(env) {

  const now = new Date();

  // 1. Avant 20h35 : aucun appel API-Football.
  if (now < MONITORING_START) {
    console.log(`💤 Hors match — ${now.toISOString()}`);
    return;
  }

  // 2. Sécurité absolue après 23h45.
  if (now > SAFETY_STOP) {
    console.log("🛑 Fenêtre de surveillance terminée.");
    return;
  }

  // 3. Si le match a déjà été marqué comme terminé : aucun appel API.
  const alreadyFinished =
    await env.MATCH_EVENTS.get(KV_FINISHED_KEY);

  if (alreadyFinished) {
    console.log("🏁 Match déjà terminé — aucun appel API.");
    return;
  }


  // 4. Message de contrôle pré-match.
  const readyAlreadySent =
    await env.MATCH_EVENTS.get(KV_READY_KEY);

  if (!readyAlreadySent) {

    await sendDiscord(
      env,
      `🟢 **ROAZHON PARLE EST PRÊT !** ❤️🖤\n\n` +
      `🏟️ **Lyon – Rennes**\n` +
      `🕣 Coup d'envoi : **20h45**\n\n` +
      `🤖 Le suivi automatique du match est activé.\n` +
      `💬 Réagissez au match ici avec nous !`
    );

    await env.MATCH_EVENTS.put(
      KV_READY_KEY,
      new Date().toISOString()
    );

    console.log("✅ Message pré-match envoyé.");
  }


  // 5. Appel API-Football.
  const response = await fetch(
    `https://v3.football.api-sports.io/fixtures?id=${FIXTURE_ID}`,
    {
      headers: {
        "x-apisports-key": env.API_FOOTBALL_KEY
      }
    }
  );

  const data = await response.json();

  if (!response.ok || Object.keys(data.errors || {}).length > 0) {
    throw new Error(
      `API-Football : ${JSON.stringify(data.errors || data)}`
    );
  }

  const match = data.response?.[0];

  if (!match) {
    throw new Error("Match introuvable dans API-Football.");
  }


  // 6. Événements déjà connus.
  const savedRaw =
    await env.MATCH_EVENTS.get(KV_EVENTS_KEY);

  let savedEvents = [];

  if (savedRaw) {
    try {
      savedEvents = JSON.parse(savedRaw);
    } catch {
      savedEvents = [];
    }
  }

  const savedSet = new Set(savedEvents);

  const events = match.events || [];

  let newEventsCount = 0;


  // 7. Recherche des nouveaux événements.
  for (const event of events) {

    const key = createEventKey(event);

    if (savedSet.has(key)) {
      continue;
    }

    const message = formatEvent(event, match);

    // Certains événements API ne nous intéressent pas.
    if (message) {

      await sendDiscord(env, message);

      newEventsCount++;

      console.log(
        `📨 Événement envoyé : ${event.type} / ${event.detail}`
      );
    }

    // On mémorise l'événement même s'il n'est pas publié.
    savedSet.add(key);
  }


  // 8. Sauvegarde anti-doublons.
  await env.MATCH_EVENTS.put(
    KV_EVENTS_KEY,
    JSON.stringify([...savedSet])
  );


  // 9. Détection de fin du match.
  const status = match.fixture?.status?.short;

  if (["FT", "AET", "PEN"].includes(status)) {

    await sendDiscord(
      env,
      `🏁 **FIN DU MATCH**\n\n` +
      `🏟️ **${match.teams.home.name} ` +
      `${match.goals.home}–${match.goals.away} ` +
      `${match.teams.away.name}**\n\n` +
      `❤️🖤 Rendez-vous dans Roazhon Parle pour le débrief !`
    );

    await env.MATCH_EVENTS.put(
      KV_FINISHED_KEY,
      new Date().toISOString()
    );

    console.log("🏁 Match terminé — surveillance arrêtée.");

    return;
  }


  console.log(
    `✅ Contrôle effectué — ${newEventsCount} nouvel événement — statut ${status}`
  );
}


function createEventKey(event) {

  return [
    event.time?.elapsed ?? "",
    event.time?.extra ?? "",
    event.team?.id ?? "",
    event.player?.id ?? "",
    event.assist?.id ?? "",
    event.type ?? "",
    event.detail ?? ""
  ].join("|");

}


function formatEvent(event, match) {

  const minute =
    `${event.time?.elapsed ?? "?"}` +
    (event.time?.extra
      ? `+${event.time.extra}`
      : "");

  const teamName =
    event.team?.name || "Équipe inconnue";

  const isRennes =
    event.team?.id === RENNES_ID;

  const teamEmoji =
    isRennes ? "🔴⚫" : "⚪🔴";


  // BUT
  if (event.type === "Goal") {

    const isPenalty =
      event.detail === "Penalty";

    const isOwnGoal =
      event.detail === "Own Goal";

    const title =
      isRennes
        ? "⚽ **BUT POUR RENNES !**"
        : "⚽ **BUT POUR LYON**";

    let detail = "";

    if (isPenalty) {
      detail = "\n🎯 Penalty";
    }

    if (isOwnGoal) {
      detail = "\n😬 But contre son camp";
    }

    return (
      `${title}\n\n` +
      `⏱️ **${minute}'**\n` +
      `${teamEmoji} **${event.player?.name || "Buteur inconnu"}**\n` +
      (
        event.assist?.name
          ? `🎯 Passe décisive : ${event.assist.name}\n`
          : ""
      ) +
      `${detail}\n\n` +
      `🏟️ **${match.teams.home.name} ` +
      `${match.goals.home}–${match.goals.away} ` +
      `${match.teams.away.name}**`
    );
  }


  // CARTONS
  if (event.type === "Card") {

    const red =
      event.detail === "Red Card";

    const emoji =
      red ? "🟥" : "🟨";

    return (
      `${emoji} **CARTON — ${teamName.toUpperCase()}**\n\n` +
      `⏱️ **${minute}'**\n` +
      `${teamEmoji} ${event.player?.name || "Joueur inconnu"}\n` +
      `${event.detail || ""}`
    );
  }


  // CHANGEMENTS
  if (event.type === "subst") {

    return (
      `🔄 **CHANGEMENT — ${teamName.toUpperCase()}**\n\n` +
      `⏱️ **${minute}'**\n` +
      `⬆️ ${event.assist?.name || "Entrant"}\n` +
      `⬇️ ${event.player?.name || "Sortant"}`
    );
  }


  // VAR
  if (event.type === "Var") {

    return (
      `📺 **VAR — ${teamName.toUpperCase()}**\n\n` +
      `⏱️ **${minute}'**\n` +
      `${event.player?.name || ""}\n` +
      `${event.detail || ""}`
    );
  }


  return null;
}


async function sendDiscord(env, message) {

  const response = await fetch(
    env.DISCORD_WEBHOOK_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        content: message
      })
    }
  );

  if (!response.ok) {

    const text = await response.text();

    throw new Error(
      `Discord ${response.status} : ${text}`
    );
  }
}
