export default {
  async fetch(request, env) {

    if (!env.MATCH_EVENTS) {
      return new Response("❌ MATCH_EVENTS absent");
    }

    try {
      await env.MATCH_EVENTS.put("test", "bonjour");

      const value = await env.MATCH_EVENTS.get("test");

      return new Response(
        `✅ KV fonctionne ! Valeur récupérée : ${value}`
      );

    } catch (error) {
      return new Response(
        `❌ Erreur KV : ${error.message}`,
        { status: 500 }
      );
    }
  },
};
