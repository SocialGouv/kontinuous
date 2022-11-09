const path = require("path")

const fs = require("fs-extra")
const { Select, Input } = require("enquirer")
const dree = require("dree")

const degit = require("~common/utils/degit-improved")
const yaml = require("~common/utils/yaml")

const ctx = require("~common/ctx")

const boilerplatesRootPath = "socialgouv/kontinuous/boilerplates/repositories"
const nativePluginPrefix = "socialgouv/kontinuous/plugins"
const defaultPluginPrefix = nativePluginPrefix

const packageDef = require("../../package.json")

const [majorVersion] = packageDef.version.split(".")

module.exports = async (opts) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")

  let boilerplate = opts.B

  const nativePluginsBoilerplate = {
    "trunk-gitops": `${boilerplatesRootPath}/trunk-gitops#v${majorVersion}`,
    "trunk-manual-prod": `${boilerplatesRootPath}/trunk-manual-prod#v${majorVersion}`,
    "gitflow-gitops": `${boilerplatesRootPath}}/gitflow-gitops#v${majorVersion}`,
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

  const dreeOptions = {}
  const tree = await dree.scanAsync(boilerplateBuildPath, dreeOptions)
  const treeStr = dree.parseTree(tree, dreeOptions)

  process.stderr.write(
    `\n📂 files that will be added to project:\n ${treeStr}\n\n`
  ) // don't use logger to avoid enquirer and asnyc log output collision

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
      message:
        "Project name (see documentation https://socialgouv.github.io/kontinuous/#/?id=_211-projectname)",
      initial: projectConfig.projectName || "",
    })
    name = await inputName.run()
  }
  if (projectConfig.projectName !== name) {
    projectConfig.projectName = name.toString()
  }

  let { plugin } = opts

  const nativePurposedPlugins = [
    `${nativePluginPrefix}/fabrique`,
    `${nativePluginPrefix}/contrib`,
  ]
  if (!plugin && plugin !== "false") {
    let autofocus = 1
    const firstPlugin = Object.values(projectConfig.dependencies || {})[0]
      ?.import
    if (firstPlugin && nativePurposedPlugins.includes(firstPlugin)) {
      autofocus = nativePurposedPlugins.indexOf(firstPlugin)
    }
    const selectPlugin = new Select({
      name: "boilerplate",
      message: "Choose a kontinuous umbrella plugin",
      autofocus,
      choices: [
        ...nativePurposedPlugins.map((pluginName) => ({
          name: pluginName,
          message: pluginName,
        })),
        {
          name: "other",
          message: "other 🛸 ",
        },
        {
          name: "false",
          message: "no plugin",
        },
      ],
    })
    plugin = await selectPlugin.run()
    if (plugin === "other") {
      const inputPlugin = new Input({
        message: "Type a plugin repository url",
      })
      plugin = await inputPlugin.run()
    }
  }

  projectConfig.dependencies = {}
  if (plugin !== "false") {
    if (!Array.isArray(plugin)) {
      plugin = [plugin]
    }
    for (let pluginUri of plugin) {
      if (!pluginUri.includes("/")) {
        pluginUri = `${defaultPluginPrefix}/${pluginUri}`
      }
      const pluginName = pluginUri.split("/").pop()
      projectConfig.dependencies[pluginName] = {
        import: pluginUri,
      }
    }
  }

  await fs.writeFile(configFile, yaml.dump(projectConfig))

  logger.info("done")
}
