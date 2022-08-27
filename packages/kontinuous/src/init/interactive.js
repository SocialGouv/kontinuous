const path = require("path")

const fs = require("fs-extra")
const { Select, Input } = require("enquirer")

const degit = require("~common/utils/degit-improved")
const yaml = require("~common/utils/yaml")

const ctx = require("~common/ctx")

const boilerplatesRootPath = "SocialGouv/kontinuous/boilerplates/repositories"

module.exports = async (opts) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")

  let boilerplate = opts.B

  const nativePluginsBoilerplate = {
    "trunk-gitops": `${boilerplatesRootPath}/trunk-gitops`,
    "trunk-manual-prod": `${boilerplatesRootPath}/trunk-manual-prod`,
    "gitflow-gitops": `${boilerplatesRootPath}}/gitflow-gitops`,
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
    const inputBoilerplate = new Input({
      message: "Select repository directory",
    })
    boilerplate = await inputBoilerplate.run()
  }
  if (nativePluginsBoilerplate[boilerplate]) {
    boilerplate = nativePluginsBoilerplate[boilerplate]
  }
  logger.info(`degit boilerplate in current directory from ${boilerplate}`)
  const { overwrite } = opts

  const boilerplateBuildPath = path.join(config.buildPath, "boilerplate")

  await degit(boilerplate, boilerplateBuildPath, { logger })
  try {
    await fs.copy(boilerplateBuildPath, config.workspacePath, {
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
    await fs.copy(boilerplateBuildPath, config.workspacePath, {
      overwrite: overwriteResponse === "overwrite",
    })
  }

  let projectConfig = {}
  const configFile = `${config.workspaceKsPath}/config.yaml`
  if (await fs.pathExists(configFile)) {
    projectConfig = yaml.load(
      await fs.readFile(configFile, { encoding: "utf-8" })
    )
  }

  let { name } = opts
  if (!name) {
    const inputName = new Input({
      message: "Project name",
      initial: projectConfig.projectName || "",
    })
    name = await inputName.run()
  }
  if (projectConfig.projectName !== name) {
    projectConfig.projectName = name.toString()
    await fs.writeFile(configFile, yaml.dump(projectConfig))
  }

  logger.info("done")
}
