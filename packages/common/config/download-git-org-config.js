const yaml = require("js-yaml")

const getRepositoryFile = require("~common/utils/get-repository-file")

const getLogger = require("~common/utils/get-logger")

module.exports = async (repositoryUrl, file, ref, logger = getLogger()) => {
  const data = await getRepositoryFile({
    repositoryUrl,
    ref,
    file,
    logger,
  })
  return data ? yaml.load(data) : {}
}
