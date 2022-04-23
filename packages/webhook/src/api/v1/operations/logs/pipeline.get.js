const { spawn } = require("child_process")
const retry = require("async-retry")
const { ctx } = require("@modjo-plugins/core")
const cleanGitRef = require("~common/utils/clean-git-ref")
const parseCommand = require("~common/utils/parse-command")
const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const logger = require("~common/utils/logger")
const asyncShell = require("~common/utils/async-shell")
const refKubecontext = require("~common/utils/ref-kubecontext")
const pipelineJobName = require("~/k8s/resources/pipeline.job-name")

module.exports = function () {
  const { jobNamespace } = ctx.require("config.project")

  const checkJobExists = async ({ jobName, kubecontext }) => {
    try {
      asyncShell(
        `kubectl --context ${kubecontext} -n ${jobNamespace} get job.batch/${jobName}`
      )
    } catch (_e) {
      // do nothing
    }
    return false
  }

  const waitJobExists = async (params) => {
    await retry(
      async () => {
        if (!checkJobExists(params)) {
          throw Error("job doesn't exists yet")
        }
      },
      {
        retries: 20,
        factor: 1,
        minTimeout: 1000,
        maxTimeout: 3000,
      }
    )
  }

  async function getOneLogsPipeline(req, res) {
    const {
      event,
      ref,
      repository: repositoryMixed,
      follow,
      since,
      catch: catchJob,
    } = req.query
    const repository = repositoryFromGitUrl(repositoryMixed)
    const repositoryName = repository.split("/").pop()
    const gitBranch = cleanGitRef(ref)

    const kubecontext = refKubecontext(ref)
    const jobName = pipelineJobName({
      eventName: event,
      repositoryName,
      gitBranch,
    })

    if (catchJob) {
      await waitJobExists({ jobName, kubecontext })
    }

    const [cmd, args] = parseCommand(`
      kubectl
        --context ${kubecontext}
        -n ${jobNamespace}
        logs
        ${since ? `--since=${since}` : ""}
        ${follow && follow !== "false" ? "--follow" : ""}
        job.batch/${jobName}
    `)
    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Transfer-Encoding": "chunked",
    })
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, {
          encoding: "utf-8",
        })
        proc.stdout.pipe(res)
        proc.stderr.pipe(res)
        proc.on("close", (code) => {
          if (code === 0) {
            resolve()
          } else {
            reject(new Error(`kubectl logs exit with code ${code}`))
          }
        })
      })
    } catch (err) {
      logger.error(err)
      throw err
    } finally {
      res.end()
    }
  }

  return [getOneLogsPipeline]
}
