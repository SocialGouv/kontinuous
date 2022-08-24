const pino = require("pino")
const fs = require("fs-extra")
const nctx = require("nctx")
const { default: test } = require("testnow")

const ctx = require("~common/ctx")
const snapshotDiff = require("~common/utils/snapshot-diff")
const loadConfig = require("~common/config/load-config")
const build = require("~/build")

const DiffError = require("./diff-error")
const reporter = require("./reporter")

module.exports = async (opts) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")

  const allEnvs = ["dev", "preprod", "prod"]
  const envDir = `${config.workspaceKsPath}/env`
  let environments = []
  if (await fs.pathExists(envDir)) {
    const subdirs = await fs.readdir(envDir)
    environments = allEnvs.filter((envName) => subdirs.includes(envName))
  }
  if (environments.length === 0) {
    environments.push(allEnvs[0])
  }

  const snapshotsDir = `${config.workspaceKsPath}/.snapshots`

  const snapConfig = {
    snapshotsDir,
    update: opts.U,
  }

  test.group("snapshots", () => {
    for (const environment of environments) {
      test(`generate manifests for env: ${environment}`, async (end) => {
        await nctx.fork(async () => {
          const ctxConfig = await loadConfig(opts, [], { environment })
          ctx.set("config", ctxConfig)
          const loggerChild = logger.child({})
          loggerChild.level = pino.levels.values.error
          ctx.set("logger", loggerChild)
          const { manifests } = await build(opts)
          const snapshotName = `manifests.${environment}.yaml`
          try {
            const diffResult = await snapshotDiff(
              manifests,
              snapshotName,
              snapConfig
            )
            if (diffResult.created) {
              console.log(`snapshot "${snapshotName}" created`)
            } else if (diffResult.updated) {
              console.log(`snapshot "${snapshotName}" updated`)
            } else if (diffResult.diff) {
              throw new DiffError(diffResult.diff, snapshotName)
            }
            end()
          } catch (err) {
            end(err)
          }
        }, [ctx])
      })
    }
  })
  const results = await test.run()
  reporter(results)
  if (results.errors.length > 0) {
    process.exit(1)
  }
}
