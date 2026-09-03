export default {
  async fetch(request, env) {
    const response = await fetch(
      "https://v3.football.api-sports.io/fixtures?team=94&season=2026&from=2026-09-03&to=2026-09-20",
      {
        headers: {
          "x-apisports-key": env.API_FOOTBALL_KEY,
        },
      }
    );

    const text = await response.text();

    return new Response(
      `HTTP ${response.status}\n\n${text}`,
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      }
    );
  },
};
