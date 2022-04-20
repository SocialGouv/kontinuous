module.exports =
  ({ services }) =>
  async ({ ref, after, repositoryUrl }) =>
    services.pipeline({
      eventName: "created",
      kubecontext: "prod",
      ref,
      after,
      repositoryUrl,
      args: ["deploy"],
      checkout: true,
    })
