export default {
  async fetch(request, env) {
    try {

    // Pour l'instant on conserve le match Angers - Rennes
    // On mettra l'ID Sturm Graz - Rennes après notre test.
    const FIXTURE_ID = 1552747;

    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?id=${FIXTURE_ID}`,
      {
        headers: {
          "x-apisports-key": env.API_FOOTBALL_KEY,
        },
      }
    );

    if (!response.ok) {
      return new Response(
        `Erreur API-Football : ${response.status}`,
        { status: 500 }
      );
    }

    const data = await response.json();
    const match = data.response?.[0];

    if (!match) {
      return new Response("Match introuvable", { status: 404 });
    }

    const events = match.events || [];

    if (events.length === 0) {
      return new Response("Aucun événement pour le moment.");
    }

    // Liste des événements déjà envoyés sur Discord
    const savedEvents = await env.MATCH_EVENTS.get(
      `fixture-${FIXTURE_ID}`,
      { type: "json" }
    ) || [];

    const sentEvents = new Set(savedEvents);

    // On cherche TOUS les nouveaux événements,
    // Rennes comme adversaire.
    const newEvents = events.filter(event => {
      const key = createEventKey(event);
      return !sentEvents.has(key);
    });

    if (newEvents.length === 0) {
      return new Response(
        "Aucun nouvel événement à envoyer. ❤️🖤"
      );
    }

    let sentCount = 0;

    for (const event of newEvents) {

      const message = formatEvent(event, match);

      // Certains événements peuvent être ignorés
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
        return new Response(
          `Erreur Discord : ${discordResponse.status}`,
          { status: 500 }
        );
      }

      sentCount++;
    }

    // On mémorise tous les événements actuellement connus.
    // Ainsi ils ne seront pas renvoyés au prochain passage.
    const allEventKeys = events.map(createEventKey);

    await env.MATCH_EVENTS.put(
      `fixture-${FIXTURE_ID}`,
      JSON.stringify(allEventKeys)
    );

    return new Response(
      `${sentCount} nouvel événement envoyé sur Discord. ❤️🖤`
    );
  },
};


function createEventKey(event) {
  return [
    event.time?.elapsed ?? "",
    event.time?.extra ?? "",
    event.team?.id ?? "",
    event.player?.id ?? "",
    event.assist?.id ?? "",
    event.type ?? "",
    event.detail ?? ""
  ].join("-");
}


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


  // ⚽ BUT
  if (event.type === "Goal") {

    let emoji = "⚽";

    if (event.detail === "Missed Penalty") {
      return (
        `❌ **PENALTY RATÉ — ${teamName.toUpperCase()}**\n\n` +
        `⏱️ **${minute}**\n` +
        `👤 ${event.player?.name || "Joueur inconnu"}\n\n` +
        `🏟️ **${homeName} ${homeScore}–${awayScore} ${awayName}**`
      );
    }

    return (
      `${emoji} **BUT — ${teamName.toUpperCase()} !**\n\n` +
      `⏱️ **${minute}**\n` +
      `👤 **${event.player?.name || "Buteur inconnu"}**\n` +
      `🎯 Passe décisive : ${event.assist?.name || "aucune"}\n\n` +
      `🏟️ **${homeName} ${homeScore}–${awayScore} ${awayName}**`
    );
  }


  // 🟨 / 🟥 CARTON
  if (event.type === "Card") {

    const isRed =
      event.detail?.toLowerCase().includes("red");

    const cardEmoji =
      isRed ? "🟥" : "🟨";

    return (
      `${cardEmoji} **CARTON — ${teamName.toUpperCase()}**\n\n` +
      `⏱️ **${minute}**\n` +
      `👤 ${event.player?.name || "Joueur inconnu"}\n` +
      `${event.detail || ""}`
    );
  }


  // 🔄 REMPLACEMENT
  if (event.type === "subst") {

    return (
      `🔄 **CHANGEMENT — ${teamName.toUpperCase()}**\n\n` +
      `⏱️ **${minute}**\n` +
      `⬆️ ${event.assist?.name || "Entrant"}\n` +
      `⬇️ ${event.player?.name || "Sortant"}`
    );
  }


  // 📺 VAR
  if (event.type === "Var") {

    return (
      `📺 **VAR — ${teamName.toUpperCase()}**\n\n` +
      `⏱️ **${minute}**\n` +
      `${event.detail || "Décision VAR"}`
    } catch (error) {
      return new Response(
        `❌ ERREUR WORKER\n\n${error.stack || error.message || error}`,
        {
          status: 500,
          headers: {
            "Content-Type": "text/plain; charset=utf-8"
          }
        }
      );
    }
  },
};


  // Pour la V2 on ignore les événements non gérés
  return null;
}
