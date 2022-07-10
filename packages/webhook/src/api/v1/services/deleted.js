module.exports = function ({ services }) {
  return ({ ref, after, defaultBranch, repositoryUrl }) =>
    services.pipeline({
      eventName: "deleted",
      kubecontext: "dev",
      ref: ref || defaultBranch,
      after,
      repositoryUrl,
      args: ["deploy", "--chart", "deactivate"],
      checkout: true,
    })
}
