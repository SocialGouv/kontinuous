const degitImproved = require("~common/utils/degit-improved")

module.exports = async (dependency, target, _config, logger) => {
  const { degit: degitUri } = dependency
  if (dependency.repository) {
    throw new Error(
      `repository and degit variable are mutually exclusive for chart dependency: ${JSON.stringify(
        dependency,
        null,
        2
      )}`
    )
  }
  const chartName = dependency.alias || dependency.name
  logger.debug(`⬇️  downloading chart ${degitUri}`)
  await degitImproved(degitUri, `${target}/charts/${chartName}`, {
    logger: logger.child({
      dependency,
    }),
  })
  dependency.repository = `file://./charts/${chartName}`
  delete dependency.degit
}
