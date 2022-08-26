const qs = require("qs")
const retry = require("async-retry")

const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const axios = require("~common/utils/axios-retry")
const handleAxiosError = require("~common/utils/handle-axios-error")

const ctx = require("~common/ctx")

module.exports = async (options) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")

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

  const event = options.event || config.event

  const repository = repositoryFromGitUrl(repositoryMixed)

  const { webhookUri, webhookToken: token } = config

  const query = qs.stringify({
    project: config.projectName,
    repository,
    event,
    env,
    ref: branch,
    commit,
    catch: options.catch ? true : undefined,
    follow: true,
    token,
  })
  const url = `${webhookUri}/api/v1/oas/logs/pipeline?${query}`

  const writeStream = process.stdout

  let realFinish = false
  try {
    await retry(
      async (bail) => {
        let currentLine = ""
        const checkEndFlagCurrentLine = () => {
          if (currentLine === "### KONTINUOUS-STREAM-END ###") {
            realFinish = true
          }
        }
        const handleOut = (outputBuffer) => {
          const output = outputBuffer.toString()
          const [current, next] = output.split("\n")
          currentLine += current
          checkEndFlagCurrentLine(currentLine)
          currentLine = next
          checkEndFlagCurrentLine(currentLine)
        }

        try {
          const response = await axios({
            method: "get",
            url,
            responseType: "stream",
          })
          response.data.on("data", handleOut)
          response.data.pipe(writeStream)
          await new Promise((resolve, _reject) => {
            response.data.on("end", () => {
              resolve()
            })
          })
        } catch (err) {
          bail(err)
        }
        if (!realFinish) {
          logger.warn("stream interrupted, retrying...")
          throw Error("not true finish, retry")
        }
      },
      {
        retries: 2,
        factor: 1,
        minTimeout: 1000,
        maxTimeout: 3000,
      }
    )
  } catch (error) {
    handleAxiosError(error, logger)
  }

  if (!realFinish) {
    logger.error("logs streaming was interrupted, retry limit reached")
    process.exit(1)
  }
}
