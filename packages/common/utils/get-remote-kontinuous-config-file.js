const yaml = require("js-yaml")

const getRepositoryFile = require("./get-repository-file")

const defaultLogger = require("./logger")

module.exports = async (
  repositoryUrl,
  ref,
  { logger = defaultLogger } = {}
) => {
  const data = await getRepositoryFile({
    repositoryUrl,
    ref,
    file: ".kontinuous/config.yaml",
    logger,
  })
  return yaml.load(data)
}
