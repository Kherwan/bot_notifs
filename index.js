export default {
  async fetch(request, env) {
    const response = await fetch(
      "https://v3.football.api-sports.io/status",
      {
        headers: {
          "x-apisports-key": env.API_FOOTBALL_KEY,,
        },
      }
    );

    if (!response.ok) {
      return new Response(
        `Erreur API-Football : ${response.status}`,
        { status: 500 }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  },
};
