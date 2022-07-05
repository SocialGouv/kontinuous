module.exports =
  ({ services }) =>
  async ({ ref, after, repositoryUrl, commits }) =>
    services.pipeline({
      eventName: "pushed",
      ref,
      after,
      repositoryUrl,
      args: ["deploy"],
      checkout: true,
      commits,
    })
