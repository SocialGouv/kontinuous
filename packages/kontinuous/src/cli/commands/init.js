const fs = require("fs-extra")
const { Select, prompt } = require("enquirer")

const degit = require("~common/utils/degit-improved")
const logger = require("~common/utils/logger")

const ctx = require("~/ctx")

const options = require("../options")

module.exports = (program) =>
  program
    .command("init")
    .description("Init project repository with boilerplate")
    .addOption(options.cwd)
    .option("--dev", "init also local dev environment config")
    .option("--boilerplate, -b", "specify boilerplate url, repository or name")
    .option("--overwrite", "overwrite existing file")
    .action(async (opts, _command) => {
      const config = ctx.require("config")

      try {
        let boilerplate = opts.B
        const nativePluginsBoilerplate = {
          "fabrique-webhook":
            "SocialGouv/kontinuous/plugins/fabrique/boilerplates/workspace-webhook",
        }
        if (!boilerplate) {
          const selectBoilerplate = new Select({
            name: "boilerplate",
            message: "Choose a boilerplate",
            autofocus: 1,
            choices: [
              {
                name: "other",
                message: "other 🛸 ",
              },
              ...Object.keys(nativePluginsBoilerplate).map((name) => ({
                name,
                message: `${name} 🚀`,
              })),
            ],
          })
          boilerplate = await selectBoilerplate.run()
        }
        if (boilerplate === "other") {
          boilerplate = await prompt({
            type: "input",
            name: "boilerplate",
            message: "Select repository directory",
          })
        }
        if (nativePluginsBoilerplate[boilerplate]) {
          boilerplate = nativePluginsBoilerplate[boilerplate]
        }
        logger.info(
          `degit boilerplate in current directory from ${boilerplate}`
        )
        const { overwrite } = opts
        await degit(boilerplate, config.buildPath, { logger })
        try {
          await fs.copy(config.buildPath, config.workspacePath, {
            overwrite,
            errorOnExist: true,
          })
        } catch (error) {
          if (!error.toString().includes("already exists")) {
            throw error
          }
          const selectOverwrite = new Select({
            name: "overwrite",
            message: "File already exists, overwrite ?",
            autofocus: 1,
            choices: [
              {
                name: "overwrite",
                message: "overwrite existing files",
              },
              {
                name: "keep",
                message: "keep existing files",
              },
              {
                name: "cancel",
                message: "cancel operation",
              },
            ],
          })

          const overwriteResponse = await selectOverwrite.run()
          if (overwriteResponse === "cancel") {
            return
          }
          await fs.copy(config.buildPath, config.workspacePath, {
            overwrite: overwriteResponse === "overwrite",
          })
        }
        logger.info("done")
      } catch (err) {
        if (err === "") {
          return
        }
        throw err
      }
    })
