export default {
  async fetch(request, env) {
    try {
      // ============================================================
      // CONFIGURATION
      // ============================================================

      // Ancien match Angers - Rennes utilisé pour notre test.
      // On remplacera cet ID par Sturm Graz - Rennes ensuite.
      const FIXTURE_ID = 1636341;


      // ============================================================
      // 1. RÉCUPÉRATION DU MATCH VIA API-FOOTBALL
      // ============================================================

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
          `❌ Erreur API-Football : HTTP ${response.status}`,
          { status: 500 }
        );
      }

      const data = await response.json();

      // Vérification des éventuelles erreurs renvoyées par API-Football
      if (
        data.errors &&
        (
          (Array.isArray(data.errors) && data.errors.length > 0) ||
          (!Array.isArray(data.errors) && Object.keys(data.errors).length > 0)
        )
      ) {
        return new Response(
          `❌ API-Football a renvoyé une erreur :\n\n${JSON.stringify(data.errors)}`,
          {
            status: 500,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
            },
          }
        );
      }

      const match = data.response?.[0];

      if (!match) {
        return new Response(
          "❌ Match introuvable dans API-Football.",
          { status: 404 }
        );
      }


      // ============================================================
      // 2. RÉCUPÉRATION DES ÉVÉNEMENTS
      // ============================================================

      const events = match.events || [];

      if (events.length === 0) {
        return new Response(
          "ℹ️ Aucun événement dans ce match pour le moment."
        );
      }


      // ============================================================
      // 3. RÉCUPÉRATION DE LA MÉMOIRE KV
      // ============================================================

      if (!env.MATCH_EVENTS) {
        return new Response(
          "❌ Le binding KV MATCH_EVENTS est absent.",
          { status: 500 }
        );
      }

      const kvKey = `fixture-${FIXTURE_ID}`;

      const savedEvents =
        (await env.MATCH_EVENTS.get(kvKey, { type: "json" })) || [];

      const sentEvents = new Set(savedEvents);


      // ============================================================
      // 4. DÉTECTION DES NOUVEAUX ÉVÉNEMENTS
      // ============================================================

      const newEvents = events.filter((event) => {
        const eventKey = createEventKey(event);
        return !sentEvents.has(eventKey);
      });

      if (newEvents.length === 0) {
        return new Response(
          "✅ Aucun nouvel événement à envoyer. ❤️🖤"
        );
      }


      // ============================================================
      // 5. ENVOI DES NOUVEAUX ÉVÉNEMENTS SUR DISCORD
      // ============================================================

      let sentCount = 0;

      for (const event of newEvents) {
        const message = formatEvent(event, match);

        // Certains types d'événements sont volontairement ignorés
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
          const discordError = await discordResponse.text();

          throw new Error(
            `Discord HTTP ${discordResponse.status} : ${discordError}`
          );
        }

        sentCount++;
      }


      // ============================================================
      // 6. SAUVEGARDE DES ÉVÉNEMENTS DANS KV
      // ============================================================

      const allEventKeys = events.map(createEventKey);

      await env.MATCH_EVENTS.put(
        kvKey,
        JSON.stringify(allEventKeys)
      );


      // ============================================================
      // 7. RÉSULTAT
      // ============================================================

      return new Response(
        `✅ ${sentCount} nouvel événement envoyé sur Discord. ❤️🖤`
      );

    } catch (error) {

      // Si quelque chose plante, on affiche directement l'erreur
      // dans le navigateur au lieu d'avoir une page 1101.

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
  },
};


// ============================================================
// CRÉATION D'UN IDENTIFIANT UNIQUE POUR CHAQUE ÉVÉNEMENT
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


  // ============================================================
  // AUTRES ÉVÉNEMENTS
  // ============================================================

  // On ne les publie pas pour le moment.
  return null;
}
