export default {
  async fetch(request, env) {
    return new Response(
      env.TEST_SECRET ? "TEST SECRET OK ❤️🖤" : "TEST SECRET ABSENT"
    );
  },
};
