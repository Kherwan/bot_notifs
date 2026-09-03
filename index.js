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

    return new Response(text, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
};
