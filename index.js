export default {
  async fetch(request, env) {
    if (!env.DISCORD_WEBHOOK_URL) {
      return new Response("SECRET ABSENT", { status: 500 });
    }

    return new Response("SECRET OK ❤️🖤");
  },
};
