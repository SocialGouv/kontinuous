module.exports =
  ({ services }) =>
  async ({ ref, after, repositoryUrl }) =>
    services.pipeline({
      eventName: "created",
      ref,
      after,
      repositoryUrl,
      args: ["deploy"],
      checkout: true,
    })
