export default {
  async fetch(request, env) {
    const response = await fetch(
      "https://v3.football.api-sports.io/fixtures?date=2026-09-19",
      {
        headers: {
          "x-apisports-key": env.API_FOOTBALL_KEY,
        },
      }
    );

    const data = await response.json();

    const matches = (data.response || []).map(match => ({
      id: match.fixture?.id,
      competition: match.league?.name,
      home: match.teams?.home?.name,
      away: match.teams?.away?.name,
      date: match.fixture?.date,
      status: match.fixture?.status?.short
    }));

    return new Response(
      JSON.stringify({
        errors: data.errors,
        nombre_de_matchs: matches.length,
        matchs: matches
      }, null, 2),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        }
      }
    );
  },

  async scheduled(event, env, ctx) {
    console.log(
      `✅ CRON OK — ${new Date().toISOString()}`
    );
  }
};
