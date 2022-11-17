module.exports = function ({ services }) {
  return ({ ref, after, repositoryUrl, kontinuousVersion, mountKubeconfig }) =>
    services.pipeline({
      eventName: "deleted",
      ref,
      after,
      repositoryUrl,
      args: ["deploy", "--chart", "deactivate", "--ignore-project-templates"],
      checkout: true,
      kontinuousVersion,
      mountKubeconfig,
    })
}
