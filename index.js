export default {
  async fetch(request, env) {
    if (!env.API_FOOTBALL_KEY) {
      return new Response("CLÉ API ABSENTE", { status: 500 });
    }

    return new Response("CLÉ API PRÉSENTE ❤️🖤");
  },
};
