const { spawn } = require("child_process")

const retry = require("async-retry")
const { ctx } = require("@modjo-plugins/core")
const { reqCtx } = require("@modjo-plugins/express/ctx")

const cleanGitRef = require("~common/utils/clean-git-ref")
const parseCommand = require("~common/utils/parse-command")
const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const normalizeRepositoryKey = require("~common/utils/normalize-repository-key")
const refEnv = require("~common/utils/ref-env")
const kubectlRetry = require("~common/utils/kubectl-retry")
const pipelineJobName = require("~/k8s/resources/pipeline.job-name")

module.exports = function ({ services }) {
  const logger = ctx.require("logger")
  const readyToLogPhases = ["Running", "Succeeded", "Failed"]
  const checkJobExists = async ({ jobName, commit, kubeconfig }) => {
    const jobNamespace = reqCtx.require("jobNamespace")
    try {
      const jsonPodStatus = await kubectlRetry(
        `-n ${jobNamespace}
        get pods
        --selector=job-name=${jobName},commit-sha=${commit}
        --sort-by=.metadata.creationTimestamp
        --output=jsonpath={.items[-1].status}
      `,
        { kubeconfig, logger }
      )
      const podStatus = JSON.parse(jsonPodStatus)
      const { phase } = podStatus
      return readyToLogPhases.includes(phase)
    } catch (_e) {
      // do nothing, job is not found
    }
    return false
  }

  const waitJobExists = async (params, waitingCallback) => {
    await retry(
      async (_bail) => {
        if (!(await checkJobExists(params))) {
          throw new Error("job doesn't exists")
        }
      },
      {
        retries: 300,
        factor: 1,
        minTimeout: 1000,
        maxTimeout: 3000,
        onRetry: waitingCallback,
      }
    )
  }

  const runLogStream = async ({ res, kubeconfig, follow, since, jobName }) => {
    const jobNamespace = reqCtx.require("jobNamespace")
    const [cmd, args] = parseCommand(`
      kubectl
        -n ${jobNamespace}
        logs
        ${since ? `--since=${since}` : ""}
        ${follow && follow !== "false" ? "--follow" : ""}
        job.batch/${jobName}
    `)
    await new Promise((resolve, reject) => {
      const proc = spawn(cmd, args, {
        encoding: "utf-8",
        env: {
          ...process.env,
          ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
        },
      })

      proc.stdout.on("data", (buffer) => {
        res.write(buffer)
      })
      proc.stderr.on("data", (buffer) => {
        res.write(buffer)
      })
      proc.on("close", (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`kubectl logs exit with code ${code}`))
        }
      })
    })
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

    let { env } = req.query

    const jobNamespace = reqCtx.require("jobNamespace")

    const repository = repositoryFromGitUrl(repositoryMixed)
    const repositoryName = repository.split("/").pop()
    const gitBranch = cleanGitRef(ref)

    const repositories = ctx.require("config.project.repositories")
    const repositoryKey = normalizeRepositoryKey(repositoryMixed)
    const repo = repositories[repositoryKey]

    const deployKey = repo?.deployKey

    const repositoryConfig = await services.getRepoConfig({
      repository: repositoryMixed,
      gitBranch,
      gitSha: commit,
      event,
      environment: env,
      deployKey,
    })

    if (!env) {
      const { environmentPatterns } = repositoryConfig
      env = refEnv(ref, environmentPatterns)
    }
    const { cluster } = repositoryConfig

    if (!env) {
      res.writeHead(204, {
        "Content-Type": "text/plain",
      })
      res.write("no env matching for current ref\n")
      res.end()
      return
    }

    let kubeconfig
    try {
      kubeconfig = await services.getKubeconfig(cluster)
    } catch (error) {
      res.writeHead(404, {
        "Content-Type": "text/plain",
      })
      res.write(`\n💀 error: ${error.message}\n`)
      res.end()
      return
    }

    const jobName = pipelineJobName({
      eventName: event,
      repositoryName,
      gitBranch,
    })

    res.writeHead(200, {
      "Content-Type": "text/plain",
      "Transfer-Encoding": "chunked",
    })

    res.write("🛰️ webhook service is connecting to kubernetes...\n")

    let tryIteration = 0
    const waitingCallback = () => {
      if (tryIteration === 0) {
        res.write(`🔭 waiting for job ${jobName} #${commit}..`)
      }
      res.write(".")
      tryIteration++
    }

    const writeStreamEnd = (data) => {
      res.write("### KONTINUOUS-STREAM-END ###\n")
      res.write(JSON.stringify(data))
      res.end()
    }

    if (catchJob) {
      try {
        await waitJobExists({ jobName, commit, kubeconfig }, waitingCallback)
        if (tryIteration > 0) {
          res.write("\n")
        }
      } catch (err) {
        logger.error(
          { kubeconfig, jobNamespace, jobName },
          "expected job not found"
        )
        res.write(
          `\n💀 error: unable to find expected job "${jobName}" #${commit}\n`
        )

        writeStreamEnd({ ok: false, error: "not-found" })
        return
      }
    }

    try {
      await runLogStream({
        res,
        kubeconfig,
        follow,
        since,
        jobName,
      })
      res.write(`\n🏁 end of logging succeeded\n`)
      writeStreamEnd({ ok: true })
    } catch (err) {
      logger.error(err)
      res.write(
        `\n❌ end of logging with error, consult webhook service pod logs for full details\n`
      )
      writeStreamEnd({ ok: false, error: "unkown" })
    }
  }

  return [getOneLogsPipeline]
}
