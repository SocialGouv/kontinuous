module.exports = function ({ services }) {
  return ({
    ref,
    after,
    repositoryUrl,
    kontinuousVersion,
    mountKubeconfig,
    serviceAccountName,
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
      serviceAccountName,
      mountSecrets,
      chart: "deactivate",
      ignoreProjectTemplates: true,
    })
}
