module.exports =
  ({ services }) =>
  async ({ ref, repositoryUrl }) =>
    services.pipeline({
      eventName: "created",
      kubecontext: "prod",
      ref,
      repositoryUrl,
      args: ["deploy"],
      checkout: true,
    })
