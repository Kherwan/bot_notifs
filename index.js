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
