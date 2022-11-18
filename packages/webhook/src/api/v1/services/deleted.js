module.exports = function ({ services }) {
  return ({ ref, after, repositoryUrl, kontinuousVersion, mountKubeconfig }) =>
    services.pipeline({
      eventName: "deleted",
      ref,
      after,
      repositoryUrl,
      args: ["deploy"],
      checkout: true,
      kontinuousVersion,
      mountKubeconfig,
      chart: "deactivate",
      ignoreProjectTemplates: true,
    })
}
