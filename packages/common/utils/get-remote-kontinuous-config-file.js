const yaml = require("js-yaml")

const getRepositoryFile = require("./get-repository-file")

const getLogger = require("./get-logger")

module.exports = async (
  repositoryUrl,
  ref,
  { logger = getLogger(), deployKey } = {}
) => {
  const data = await getRepositoryFile({
    repositoryUrl,
    ref,
    file: ".kontinuous/config.yaml",
    deployKey,
    logger,
  })
  return data ? yaml.load(data) : {}
}
