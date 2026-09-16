export default {
  async fetch(request, env) {
    try {
      const response = await fetch(
        "https://v3.football.api-sports.io/fixtures?date=2026-09-16",
        {
          headers: {
            "x-apisports-key": env.API_FOOTBALL_KEY,
          },
        }
      );

      const data = await response.json();

      const rennesMatch = data.response?.find(match =>
        match.teams?.home?.id === 94 ||
        match.teams?.away?.id === 94
      );

      if (!rennesMatch) {
        return new Response(
          "❌ Aucun match de Rennes trouvé aujourd'hui."
        );
      }

      return new Response(
        JSON.stringify({
          fixture_id: rennesMatch.fixture.id,
          home: rennesMatch.teams.home.name,
          away: rennesMatch.teams.away.name,
          date: rennesMatch.fixture.date,
          competition: rennesMatch.league.name,
          status: rennesMatch.fixture.status
        }, null, 2),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          }
        }
      );

    } catch (error) {
      return new Response(
        `❌ ${error.message}`,
        { status: 500 }
      );
    }
  },
};
