export default {
  async fetch(request, env) {
    const matchId = "db9b73aa-0cbb-4438-95e4-867ee91fb03d";

    const response = await fetch(
      `https://api.bigballsdata.com/v1/matches/${matchId}/events?sport=football`,
      {
        headers: {
          "x-api-key": env.BIGBALLS_API_KEY,
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
