module.exports = function ({ services }) {
  return ({
    ref,
    after,
    repositoryUrl,
    kontinuousVersion,
    mountKubeconfig,
    mountSecrets,
  }) =>
    services.pipeline({
      eventName: "deleted",
      ref,
      after,
      repositoryUrl,
      args: ["deploy"],
      checkout: true,
      kontinuousVersion,
      mountKubeconfig,
      mountSecrets,
      chart: "deactivate",
      ignoreProjectTemplates: true,
    })
}
