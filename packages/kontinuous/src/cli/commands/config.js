const get = require("lodash.get")

const getRemoteKontinuousConfigFile = require("~common/utils/get-remote-kontinuous-config-file")
const yaml = require("~common/utils/yaml")

const loadConfig = require("~common/config/load-config")
const ctx = require("~common/ctx")

const options = require("../options")

module.exports = (program) =>
  program
    .command("config")
    .description("Get config value")
    .addOption(options.cwd)
    .option(
      "--remote",
      "select config using kontinuous config from remote repo"
    )
    .option(
      "--format <format>",
      "select output format for objects: yaml|json, default to yaml"
    )
    .argument("[key]", "the key, using dotkey format")
    .action(async (key, opts, _command) => {
      let config = ctx.require("config")

      if (opts.remote) {
        const { event } = config
        const ref = event === "deleted" ? "HEAD" : config.gitBranch
        const kontinuousRepoConfig = await getRemoteKontinuousConfigFile(
          config.gitRepositoryUrl,
          ref
        )
        config = await loadConfig(opts, [kontinuousRepoConfig])
      }

      let value
      if (key) {
        value = get(config, key)
      } else {
        value = config
      }

      let outputValue
      if (typeof value === "object") {
        if (opts.format === "json") {
          outputValue = JSON.stringify(value)
        } else {
          outputValue = yaml.dump(value)
        }
      } else {
        outputValue = value || ""
      }

      process.stdout.write(outputValue)
    })
