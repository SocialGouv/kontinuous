const get = require("lodash.get")

const getRemoteKontinuousConfigFile = require("~common/utils/get-remote-kontinuous-config-file")
const yaml = require("~common/utils/yaml")

const loadConfig = require("~common/config/load-config")
const ctx = require("~common/ctx")
const getGitRemoteDefaultBranch = require("~common/utils/get-git-remote-default-branch")
const getGitUrl = require("~common/utils/get-git-url")
const normalizeRepositoryUrl = require("~common/utils/normalize-repository-url")

const options = require("../options")

module.exports = (program) =>
  program
    .command("config")
    .description("Get config value")
    .addOption(options.cwd)
    .addOption(options.private)
    .addOption(options.deployKey)
    .addOption(options.gitDiffEnabled)
    .addOption(options.gitOrg)
    .option(
      "--remote",
      "select config using kontinuous config from remote repo"
    )
    .option("--disable-load-dependencies", "disable load dependencies")
    .option(
      "--format <format>",
      "select output format for objects: yaml|json, default to yaml"
    )
    .argument("[key]", "the key, using dotkey format")
    .action(async (key, opts, _command) => {
      let config = ctx.require("config")
      const logger = ctx.require("logger")

      if (opts.remote) {
        const { event } = config

        // const ref = event === "deleted" ? "HEAD" : config.gitBranch
        let ref = config.gitBranch
        if (event === "deleted") {
          if (config.gitDefaultBranch) {
            ref = config.gitDefaultBranch
          } else {
            let gitUrl
            if (config.gitRepositoryUrl) {
              gitUrl = config.gitRepositoryUrl
            } else {
              gitUrl = await getGitUrl()
            }
            const protocol = config.deployKeyFile ? "ssh" : "https"
            gitUrl = normalizeRepositoryUrl(gitUrl, protocol)
            ref = await getGitRemoteDefaultBranch(gitUrl)
          }
        }

        const loadDependencies = opts.disableLoadDependencies !== true

        const kontinuousRepoConfig = await getRemoteKontinuousConfigFile(
          config.gitRepositoryUrl,
          ref,
          { logger, deployKey: config.deployKeyFile }
        )
        config = await loadConfig(
          opts,
          [kontinuousRepoConfig],
          {},
          { loadDependencies }
        )
      }

      let value
      if (key) {
        value = get(config, key)
      } else {
        value = config
      }

      let outputValue
      if (typeof value === "object") {
        outputValue = JSON.stringify(value, (_key, val) => {
          if (val instanceof RegExp) {
            return val.toString()
          }
          return val
        })
        if (opts.format !== "json") {
          outputValue = yaml.dump(JSON.parse(outputValue))
        }
      } else {
        outputValue = value || ""
      }

      process.stdout.write(outputValue.toString())
    })
