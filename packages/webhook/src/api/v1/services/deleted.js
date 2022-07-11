module.exports = function ({ services }) {
  return ({ ref, after, defaultBranch, repositoryUrl }) =>
    services.pipeline({
      eventName: "deleted",
      kubecontext: "dev",
      ref,
      defaultBranch,
      after,
      repositoryUrl,
      args: ["deploy", "--chart", "deactivate", "--ignore-project-templates"],
      checkout: true,
    })
}
