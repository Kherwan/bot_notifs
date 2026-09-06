export default {
  async fetch(request, env) {

    const response = await fetch(
      "https://v3.football.api-sports.io/fixtures?id=1552747",
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

    const rennesEvents = events.filter(
      event => event.team?.id === 94
    );

    if (rennesEvents.length === 0) {
      return new Response("Aucun événement Rennes pour le moment.");
    }

    const event = rennesEvents[rennesEvents.length - 1];

    let message = "";

    if (event.type === "Goal") {
      message =
        `⚽ **BUT POUR RENNES !**\n\n` +
        `⏱️ **${event.time.elapsed}'**\n` +
        `🔴⚫ **${event.player?.name || "Buteur inconnu"}**\n` +
        `🎯 Passe décisive : ${event.assist?.name || "aucune"}\n\n` +
        `🏟️ Angers ${match.goals.home}–${match.goals.away} Rennes`;
    }

    else if (event.type === "Card") {
      message =
        `🟨 **CARTON POUR RENNES**\n\n` +
        `⏱️ **${event.time.elapsed}'**\n` +
        `🔴⚫ ${event.player?.name || "Joueur inconnu"}\n` +
        `${event.detail || ""}`;
    }

    else if (event.type === "subst") {
      message =
        `🔄 **CHANGEMENT POUR RENNES**\n\n` +
        `⏱️ **${event.time.elapsed}'**\n` +
        `⬆️ ${event.assist?.name || "Entrant"}\n` +
        `⬇️ ${event.player?.name || "Sortant"}`;
    }

    else {
      message =
        `📢 **ÉVÉNEMENT RENNES**\n\n` +
        `⏱️ ${event.time.elapsed}'\n` +
        `${event.type} — ${event.detail || ""}`;
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

    return new Response("Événement envoyé sur Discord ❤️🖤");
  },
};
