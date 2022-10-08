module.exports = function ({ services }) {
  return ({ ref, after, repositoryUrl }) =>
    services.pipeline({
      eventName: "deleted",
      ref,
      after,
      repositoryUrl,
      args: [
        "deploy",
        "--chart",
        "deactivate",
        "--ignore-project-templates",
        "--disable-plugin",
        "*.deploySidecar.rolloutStatus",
      ],
      checkout: true,
    })
}
