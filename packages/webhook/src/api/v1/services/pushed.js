module.exports =
  ({ services }) =>
  async ({ ref, repositoryUrl }) =>
    services.pipeline({
      eventName: "pushed",
      kubecontext: "dev",
      ref,
      repositoryUrl,
      args: ["deploy"],
      checkout: true,
    })
