export default {
  async fetch(request, env) {
    const response = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: "🤖 **Roazhon Parle est connecté !** ❤️🖤",
      }),
    });

    if (!response.ok) {
      return new Response(
        `Erreur Discord : ${response.status}`,
        { status: 500 }
      );
    }

    return new Response("Message envoyé sur Discord ! ❤️🖤");
  },
};
