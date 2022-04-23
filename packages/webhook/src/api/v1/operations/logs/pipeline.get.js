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
  const readyToLogPhases = ["Running", "Succeeded", "Failed"]
  const checkJobExists = async ({ jobName, commit, kubecontext }) => {
    try {
      const jsonPodStatus = await asyncShell(`kubectl
          --context ${kubecontext}
          -n ${jobNamespace}
          get pods
          --selector=job-name=${jobName}
          --selector="kubeworkflow/gitCommit=${commit}"
          --output=jsonpath={.items[0].status}
      `)
      const podStatus = JSON.parse(jsonPodStatus)
      const { phase } = podStatus
      return readyToLogPhases.includes(phase)
    } catch (_e) {
      // do nothing
    }
    return false
  }

  const waitJobExists = async (params, waitingCallback) => {
    await retry(
      () =>
        new Promise(async (resolve, reject) => {
          if (!(await checkJobExists(params))) {
            waitingCallback()
            reject(new Error("job doesn't exists yet"))
          }
          resolve()
        }),
      {
        retries: 20,
        factor: 1,
        minTimeout: 1000,
        maxTimeout: 3000,
      }
    )
  }

  const runLogStream = async ({ res, kubecontext, follow, since, jobName }) => {
    const [cmd, args] = parseCommand(`
      kubectl
        --context ${kubecontext}
        -n ${jobNamespace}
        logs
        ${since ? `--since=${since}` : ""}
        ${follow && follow !== "false" ? "--follow" : ""}
        job.batch/${jobName}
    `)
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

  async function getOneLogsPipeline(req, res) {
    const {
      event,
      repository: repositoryMixed,
      ref,
      commit,
      follow,
      catch: catchJob,
      since,
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

    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Transfer-Encoding": "chunked",
    })

    let tryIteration = 0
    const waitingCallback = () => {
      if (tryIteration === 0) {
        res.write(`waiting for job ${jobName}...`)
      }
      res.write(".")
      tryIteration++
    }

    if (catchJob) {
      await waitJobExists({ jobName, commit, kubecontext }, waitingCallback)
      if (tryIteration > 0) {
        res.write("\n")
      }
    }

    try {
      await runLogStream({ res, kubecontext, follow, since, jobName })
    } catch (err) {
      // retry once to handle job status race on job replace
      tryIteration = 0
      await waitJobExists({ jobName, kubecontext }, waitingCallback)
      if (tryIteration > 0) {
        res.write("\n")
      }
      await runLogStream({ res, kubecontext, follow, since, jobName })
    }
  }

  return [getOneLogsPipeline]
}
