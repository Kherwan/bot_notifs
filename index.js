export default {
  async fetch(request, env) {
    const response = await fetch(
      "https://api.bigballsdata.com/v1/soccer/fixtures?league=61",
      {
        headers: {
          "Authorization": `Bearer ${env.BIGBALLS_API_KEY}`,
          "Content-Type": "application/json",
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
