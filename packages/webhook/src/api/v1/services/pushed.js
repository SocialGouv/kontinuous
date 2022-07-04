module.exports =
  ({ services }) =>
  async ({ ref, after, repositoryUrl }) =>
    services.pipeline({
      eventName: "pushed",
      ref,
      after,
      repositoryUrl,
      args: ["deploy"],
      checkout: true,
    })
