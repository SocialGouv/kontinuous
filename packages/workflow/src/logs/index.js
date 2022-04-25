const stream = require("stream")
const { promisify } = require("util")
const axios = require("axios")

const refEnv = require("~common/utils/ref-env")
const logger = require("~common/utils/logger")
const getGitRef = require("~common/utils/get-git-ref")
const getGitSha = require("~common/utils/get-git-sha")
const getGitRepository = require("~common/utils/get-git-repository")
const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")

const eventFromBranch = (branch) => {
  const env = refEnv(branch)
  if (env === "prod") {
    return "created"
  }
  return "pushed"
}

module.exports = async (options) => {
  const cwd = options.cwd || process.cwd()
  let { event, repository: repositoryMixed, branch, commit } = options
  if (!repositoryMixed) {
    repositoryMixed = await getGitRepository(cwd)
  }
  if (!branch) {
    branch = await getGitRef(cwd)
  }
  if (!commit) {
    commit = await getGitSha(cwd, branch)
  }
  if (!event) {
    event = eventFromBranch(branch)
  }

  const repository = repositoryFromGitUrl(repositoryMixed)
  const repositoryName = repository.split("/").pop()

  const rancherProjectName =
    options.rancherProjectName ||
    process.env.KW_RANCHER_PROJECT_NAME ||
    repositoryName

  const webhookUri =
    options.webhookUri ||
    process.env.KUBEWEBHOOK_URI ||
    `https://webhook-${rancherProjectName}.fabrique.social.gouv.fr`

  const repositoryUrlencoded = encodeURIComponent(repository)
  const token = options.token || process.env.KUBEWEBHOOK_TOKEN
  const url = `${webhookUri}/api/v1/oas/logs/pipeline?repository=${repositoryUrlencoded}&event=${event}&ref=${branch}&commit=${commit}&catch=true&follow=true&token=${token}`

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
      logger.error(`logs error: status ${error.response.status}`)
      logger.error(`failed url: ${url}`)
      // logger.error(error.response.data)
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
