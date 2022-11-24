const pino = require("pino")
const fs = require("fs-extra")
const nctx = require("nctx")
const nowtest = require("nowtest")

const ctx = require("~common/ctx")
const snapshotDiff = require("~common/utils/snapshot-diff")
const loadConfig = require("~common/config/load-config")
const build = require("~/build")

const DiffError = require("./diff-error")
const reporter = require("./reporter")

module.exports = async (opts) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")

  const allEnvs = ["local", "dev", "preprod", "prod"]
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

  const test = nowtest({
    timeout: 120000,
  })

  const runSnapshotsTests = async ({ title, subdir }) =>
    test.group(title, () => {
      for (const environment of environments) {
        if (opts.E && opts.E !== environment) {
          continue
        }
        test(`generate manifests for env: ${environment}`, async (end) => {
          await nctx.fork(async () => {
            const rootConfig = {
              environment,
              gitBranch: "master",
              gitSha: "0000000000000000000000000000000000000000",
              deploymentLabelForceNewDeploy: false,
            }
            const loadConfigOptions = {
              logLevel: "error",
            }
            const inlineConfigs = []
            const ctxConfig = await loadConfig(
              opts,
              inlineConfigs,
              rootConfig,
              loadConfigOptions
            )
            ctx.set("config", ctxConfig)

            const loggerChild = logger.child({})
            loggerChild.level = pino.levels.values.error
            ctx.set("logger", loggerChild)
            const { manifests } = await build(opts)
            const snapshotName = `manifests.${environment}.yaml`
            try {
              const diffResult = await snapshotDiff(manifests, snapshotName, {
                ...snapConfig,
                ...(subdir
                  ? {
                      snapshotsDir: `${snapConfig.snapshotsDir}/${subdir}`,
                    }
                  : {}),
              })
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

  if (config.chart) {
    await runSnapshotsTests({
      title: `snapshots for charts: ${config.chart.join(",")}`,
      subdir: config.chart.join("+"),
    })
  } else {
    await runSnapshotsTests({
      title: "snapshots",
    })
  }

  const results = await test.run()
  reporter(results)
  if (results.errors.length > 0) {
    process.exit(1)
  }
}
