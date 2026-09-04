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

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        `Erreur Big Balls : ${response.status}\n\n${JSON.stringify(data, null, 2)}`,
        {
          status: 500,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }
      );
    }

    return new Response(
      JSON.stringify(data, null, 2),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  },
};
