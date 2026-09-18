const FIXTURE_ID = 1552768;

export default {
  async fetch(request, env) {
    try {
      const response = await fetch(
        `https://v3.football.api-sports.io/fixtures?id=${FIXTURE_ID}`,
        {
          headers: {
            "x-apisports-key": env.API_FOOTBALL_KEY,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || data.errors?.rateLimit || data.errors?.plan) {
        return new Response(
          `❌ API-Football\n${JSON.stringify(data.errors, null, 2)}`
        );
      }

      const match = data.response?.[0];

      if (!match) {
        return new Response("❌ Match introuvable");
      }

      return new Response(
        JSON.stringify({
          fixture_id: match.fixture.id,
          home: match.teams.home.name,
          away: match.teams.away.name,
          kickoff: match.fixture.date,
          competition: match.league.name,
          status: match.fixture.status
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

  async scheduled(event, env, ctx) {
    // Le Cron reste actif, mais aucune requête API automatique pour l'instant.
    console.log(`✅ CRON OK — ${new Date().toISOString()}`);
  }
};
