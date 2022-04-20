module.exports =
  ({ services }) =>
  async ({ ref, after, repositoryUrl }) =>
    services.pipeline({
      eventName: "pushed",
      kubecontext: "dev",
      ref,
      after,
      repositoryUrl,
      args: ["deploy"],
      checkout: true,
    })
