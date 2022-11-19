module.exports =
  ({ services }) =>
  async ({
    ref,
    after,
    repositoryUrl,
    commits,
    env,
    kontinuousVersion,
    chart,
    ignoreProjectTemplates,
    mountKubeconfig,
    mountSecrets,
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
      mountSecrets,
      chart,
      ignoreProjectTemplates,
    })
