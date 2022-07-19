const fs = require("fs-extra")

const get = require("lodash.get")
const { Select, Input } = require("enquirer")

const logger = require("~common/utils/logger")

const ctx = require("~common/ctx")

const options = require("~/cli/options")

module.exports = (program) =>
  program
    .command("seal")
    .description("Kubeseal secrets using cert from endpoint")
    .option(
      "--clusters-from-plugin [pluginName]",
      "plugin name to search for kubeseal endpoints"
    )
    .addOption(options.env)
    .option("--cluster-name [clusterName]", "cluster name")
    .action(async (opts, _command) => {
      const config = ctx.require("config")

      try {
        let { clusters } = config
        if (opts.clustersFromPlugin) {
          const dotkey = opts.clustersFromPlugin
            .split(".")
            .join(".dependencies.")
          clusters = get(config.dependencies, dotkey)
        } else if (!clusters) {
          for (const dependency of Object.values(config.dependencies)) {
            if (dependency.options.clusters) {
              clusters = dependency.options.clusters
              break
            }
          }
        }
        if (!clusters) {
          logger.error("no clusters defined in config or plugins config")
          process.exit(1)
        }

        let { E: env } = opts
        if (!env) {
          const selectEnv = new Select({
            name: "env",
            message: "Select env",
            choices: [{ name: "dev" }, { name: "preprod" }, { name: "prod" }],
          })
          env = await selectEnv.run()
        }

        let { clusterName } = opts
        if (!clusterName) {
          const autofocus = Object.values(clusters).findIndex(
            (cluster) =>
              cluster.environments && cluster.environments.includes(env)
          )
          const selectClusterName = new Select({
            name: "clusterName",
            message: "Select cluster",
            autofocus,
            choices: Object.keys(clusters).reduce((acc, key, index) => {
              acc.push({
                name: key,
                message:
                  key +
                  (index === autofocus ? ` (default for env "${env}")` : ""),
              })
              return acc
            }, []),
          })
          clusterName = await selectClusterName.run()
        }

        // --yes (all options to default)
        // --cluster, default by env
        // if !clusters from config option + enquirer plugin config list(first level plugins) default(first) dot notation get
        // option + enquirer, --files multiselect all files selected by default

        logger.info("done")
      } catch (err) {
        if (err === "") {
          return
        }
        throw err
      }
    })
