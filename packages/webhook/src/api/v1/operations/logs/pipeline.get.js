const { spawn } = require("child_process")
const { ctx } = require("@modjo-plugins/core")
const cleanGitRef = require("~common/utils/clean-git-ref")
const parseCommand = require("~common/utils/parse-command")
const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const slug = require("~common/utils/slug")
const logger = require("~common/utils/logger")

module.exports = function () {
  const { jobNamespace } = ctx.require("config.project")

  async function getOneLogsPipeline(req, res) {
    const { event, ref, repository: repositoryMixed, follow, since } = req.query
    const repository = repositoryFromGitUrl(repositoryMixed)
    const repositoryName = repository.split("/").pop()
    const gitBranch = cleanGitRef(ref)
    const branchSlug = slug(gitBranch)
    const [cmd, args] = parseCommand(`
      kubectl
        -n ${jobNamespace}
        logs
        ${since ? `--since=${since}` : ""}
        ${follow && follow !== "false" ? "--follow" : ""}
        job.batch/pipeline-${event}-${repositoryName}-${branchSlug}
    `)
    console.log(args.join(" "))
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
