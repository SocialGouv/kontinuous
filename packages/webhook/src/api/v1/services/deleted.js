module.exports = function ({ services }) {
  return ({ ref, after, defaultBranch, repositoryUrl }) =>
    services.pipeline({
      eventName: "deleted",
      kubecontext: "dev",
      ref,
      after: after || defaultBranch,
      repositoryUrl,
      args: ["deploy", "--chart", "deactivate"],
      checkout: true,
    })
}
