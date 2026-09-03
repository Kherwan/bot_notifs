export default {
  async fetch(request, env) {
    return new Response(
      JSON.stringify({
        secret_present: !!env.BIGBALLS_API_KEY,
        secret_length: env.BIGBALLS_API_KEY
          ? env.BIGBALLS_API_KEY.length
          : 0,
        correct_prefix: env.BIGBALLS_API_KEY
          ? env.BIGBALLS_API_KEY.startsWith("bbs_live_")
          : false,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  },
};
