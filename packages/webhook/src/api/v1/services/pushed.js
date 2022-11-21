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
    serviceAccountName,
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
      serviceAccountName,
      mountSecrets,
      chart,
      ignoreProjectTemplates,
    })
