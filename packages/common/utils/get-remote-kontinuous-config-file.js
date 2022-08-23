const yaml = require("js-yaml")

const getRepositoryFile = require("./get-repository-file")

const defaultLogger = require("./logger")

module.exports = async (
  repositoryUrl,
  ref,
  { logger = defaultLogger, deployKey } = {}
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
