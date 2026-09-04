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

    // On cherche le Stade Rennais (ID API-Football = 94)
    const match = data.response?.find(
      (fixture) =>
        fixture.teams?.home?.id === 94 ||
        fixture.teams?.away?.id === 94
    );

    if (!match) {
      return new Response(
        "🔴 Stade Rennais : aucun match en direct actuellement."
      );
    }

    const home = match.teams.home.name;
    const away = match.teams.away.name;
    const homeGoals = match.goals.home;
    const awayGoals = match.goals.away;
    const status = match.fixture.status;

    return new Response(
      [
        "🔴 STADE RENNAIS TROUVÉ !",
        "",
        `${home} ${homeGoals} - ${awayGoals} ${away}`,
        `Fixture ID : ${match.fixture.id}`,
        `Statut : ${status.long} (${status.elapsed ?? "?"}')`,
        "",
        `Événements : ${match.events?.length ?? 0}`,
      ].join("\n")
    );
  },
};
