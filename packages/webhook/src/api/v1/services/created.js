module.exports =
  ({ services }) =>
  async ({ ref, repositoryUrl }) =>
    services.pipeline({
      eventName: "created",
      ref,
      repositoryUrl,
      args: ["deploy"],
      checkout: true,
    })
