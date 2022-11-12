module.exports =
  ({ services }) =>
  async ({
    ref,
    after,
    repositoryUrl,
    commits,
    env,
    kontinuousVersion,
    mountKubeconfig,
  }) =>
    services.pipeline({
      eventName: "pushed",
      ref,
      after,
      repositoryUrl,
      args: ["deploy"],
      checkout: true,
      commits,
      env,
      kontinuousVersion,
      mountKubeconfig,
    })
