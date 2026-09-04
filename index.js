export default {
  async fetch(request, env) {
    const response = await fetch(
      "https://v3.football.api-sports.io/fixtures?live=all",
      {
        headers: {
          "x-apisports-key": env.API_FOOTBALL_KEY,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        `Erreur API-Football : ${response.status}\n\n${JSON.stringify(data, null, 2)}`,
        { status: 500 }
      );
    }

    const match = data.response?.find(
      (fixture) =>
        fixture.teams?.home?.id === 94 ||
        fixture.teams?.away?.id === 94
    );

    let message;

    if (!match) {
      message = "🔴 **Stade Rennais : aucun match en direct actuellement.**";
    } else {
      const home = match.teams.home.name;
      const away = match.teams.away.name;
      const homeGoals = match.goals.home;
      const awayGoals = match.goals.away;
      const status = match.fixture.status;

      message = [
        "🔴 **STADE RENNAIS — DIRECT**",
        "",
        `⚽ **${home} ${homeGoals} - ${awayGoals} ${away}**`,
        `⏱️ ${status.long} (${status.elapsed ?? "?"}')`,
        "",
        `🆔 Fixture : ${match.fixture.id}`,
        `📋 Événements : ${match.events?.length ?? 0}`,
      ].join("\n");
    }

    const discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
      }),
    });

    if (!discordResponse.ok) {
      return new Response(
        `Discord erreur : ${discordResponse.status}`,
        { status: 500 }
      );
    }

    return new Response("✅ Message envoyé sur Discord !");
  },
};
