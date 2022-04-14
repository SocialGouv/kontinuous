module.exports =
  ({ services }) =>
  async ({ ref, repositoryUrl }) =>
    services.pipeline({
      eventName: "pushed",
      ref,
      repositoryUrl,
      args: ["deploy"],
      checkout: true,
    })
