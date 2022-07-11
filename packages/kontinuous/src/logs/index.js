const stream = require("stream")
const { promisify } = require("util")
const axios = require("axios")

const logger = require("~common/utils/logger")
const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const qs = require("qs")

const ctx = require("~/ctx")

module.exports = async (options) => {
  const config = ctx.require("config")

  let { repository: repositoryMixed, branch, commit } = options
  if (!repositoryMixed) {
    repositoryMixed = config.gitRepositoryUrl
  }
  if (!branch) {
    branch = config.gitBranch
  }
  if (!commit) {
    commit = config.gitSha
  }

  const env = config.environment
  if (!env) {
    logger.warn("no env matching for current branch")
    return
  }

  const { event } = config

  const repository = repositoryFromGitUrl(repositoryMixed)

  const { webhookUri, webhookToken: token } = config

  const query = qs.stringify({
    repository,
    event,
    env,
    ref: branch,
    commit,
    catch: true,
    follow: true,
    token,
  })
  const url = `${webhookUri}/api/v1/oas/logs/pipeline?${query}`

  const finished = promisify(stream.finished)
  const writeStream = process.stdout
  try {
    await axios({
      method: "get",
      url,
      responseType: "stream",
    }).then((response) => {
      response.data.pipe(writeStream)
      return finished(writeStream)
    })
  } catch (error) {
    if (error.response) {
      logger.error(
        `log error: status ${error.response.status} ${error.response.statusText}`
      )
      if (error.response.data.msg) {
        logger.error(error.response.data.msg)
      }
      logger.error(`failed url: ${url}`)
      // logger.debug(error.response.headers)
      // logger.error(error.request)
    } else if (error.request) {
      logger.error(`logs error: request`)
      logger.error(error.request)
    } else {
      logger.error(`logs error: ${error.message}`)
    }
  }
}
