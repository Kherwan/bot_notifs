export default {
  async fetch(request, env) {
    const response = await fetch(
      "https://api.bigballsdata.com/v1/matches?sport=football&league=ligue1",
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
