const qs = require("qs")
const retry = require("async-retry")

const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const axios = require("~common/utils/axios-retry")
const handleAxiosError = require("~common/utils/handle-axios-error")
const axiosIsNetworkError = require("~common/utils/axios-is-network-error")

const ctx = require("~common/ctx")
const NetworkError = require("~common/utils/network-error.class")

module.exports = async (options) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")
  const Sentry = ctx.get("sentry")

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

  const { chart, deployCustomManifestsOnWebhook } = config

  const query = qs.stringify({
    project: config.projectName,
    repository,
    event,
    env,
    ref: branch,
    commit,
    catch: options.catch ? true : undefined,
    follow: true,
    ...(deployCustomManifestsOnWebhook
      ? {
          catch: true,
        }
      : {}),
    ...(chart && !deployCustomManifestsOnWebhook
      ? {
          chart: chart.join(","),
        }
      : {}),
  })
  const url = `${webhookUri}/api/v1/oas/logs/pipeline?${query}`

  const writeStream = process.stdout

  let finished = false
  let finalState

  try {
    await retry(
      async (bail) => {
        let currentLine = ""
        const checkEndFlagCurrentLine = (line) => {
          if (finished) {
            try {
              finalState = JSON.parse(line)
            } catch (_err) {
              // do nothing
            }
          }
          if (line === "### KONTINUOUS-STREAM-END ###") {
            finished = true
          }
        }
        const handleOut = (outputBuffer) => {
          const output = outputBuffer.toString()
          const [current, ...nexts] = output.split("\n")
          currentLine += current
          checkEndFlagCurrentLine(currentLine)
          currentLine = nexts.pop()
          for (const line of nexts) {
            checkEndFlagCurrentLine(line)
          }
          checkEndFlagCurrentLine(currentLine)
        }

        try {
          const response = await axios({
            method: "get",
            url,
            responseType: "stream",
            headers: { Authorization: `Bearer ${token}` },
          })
          response.data.on("data", handleOut)
          response.data.pipe(writeStream)
          await new Promise((resolve, reject) => {
            response.data.on("error", () => {
              const newtworkError = new NetworkError("network error")
              reject(newtworkError)
            })
            response.data.on("end", () => {
              writeStream.write("\n")
              resolve()
            })
          })
        } catch (err) {
          if (
            !(
              err instanceof NetworkError ||
              axiosIsNetworkError(err) ||
              err.code === "ECONNABORTED"
            )
          ) {
            finished = true
            bail(err)
          }
          return
        }
        if (!finished) {
          logger.warn("🌐 stream interrupted, retrying...")
          throw Error("not true finish, retry")
        }
      },
      {
        retries: 10,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 60000,
        randomize: true,
      }
    )
  } catch (error) {
    handleAxiosError(error, logger)
    if (!finished && Sentry) {
      Sentry.captureException(error)
    }
  }

  if (!finished) {
    logger.error("logs streaming was interrupted, retry limit reached")
    process.exit(1)
  }
  logger.debug(finalState || {}, "stream end")
  if (!finalState?.ok) {
    process.exit(1)
  }
}
