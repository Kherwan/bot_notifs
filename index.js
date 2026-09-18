export default {

  async fetch(request, env) {
    return new Response(
      "✅ Worker actif. Test Cron en cours.",
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      }
    );
  },

  async scheduled(event, env, ctx) {
    console.log(
      `✅ CRON OK — déclenchement automatique à ${new Date().toISOString()}`
    );
  },

};
