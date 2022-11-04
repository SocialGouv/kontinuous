const fs = require("fs-extra")
const kebabCase = require("lodash.kebabcase")

const yaml = require("../utils/yaml")
const deepmerge = require("../utils/deepmerge")
const globalLogger = require("../utils/logger")
const degitImproved = require("../utils/degit-improved")
const normalizeDegitUri = require("../utils/normalize-degit-uri")

const copyFilter = require("./copy-filter")

const recurseDependency = require("./recurse-dependencies")

module.exports = async (config, logger = globalLogger) => {
  logger.debug("Load dependencies")
  await recurseDependency({
    config,
    beforeChildren: async ({ target, definition, scope, name }) => {
      const { links = {} } = config

      let { import: importTarget } = definition
      if (importTarget) {
        importTarget = normalizeDegitUri(importTarget)

        const matchLink =
          !(importTarget.includes("@") || importTarget.includes("#")) &&
          Object.entries(links).find(([key]) => importTarget.startsWith(key))

        if (matchLink) {
          const [linkKey, linkPath] = matchLink
          const from = linkPath + importTarget.substr(linkKey.length)
          await fs.ensureDir(target)
          logger.debug({ scope }, `copy ${name} from "${from}"`)
          await fs.copy(from, target, { filter: copyFilter })
        } else {
          await degitImproved(importTarget, target, {
            logger: logger.child({
              scope,
              name,
            }),
          })
        }
      }

      // load config file
      let mergeDefinition = definition

      let { extends: extendsPlugins } = definition
      if (extendsPlugins) {
        if (!Array.isArray(extendsPlugins)) {
          extendsPlugins = [extendsPlugins]
        }
        for (const extendsPlugin of extendsPlugins) {
          const extendsFileBasename = kebabCase(extendsPlugin)
          const extendsFile = `${target}/extends/${extendsFileBasename}.yaml`
          if (!(await fs.pathExists(extendsFile))) {
            throw new Error(
              `extends ̂file ${extendsFile} not found as expected for specified extends ${extendsPlugin}`
            )
          }
          const yamlExtends = await fs.readFile(extendsFile, {
            encoding: "utf-8",
          })
          const extendsObj = yaml.load(yamlExtends)
          mergeDefinition = deepmerge({}, extendsObj, mergeDefinition)
        }
      }

      const pluginConfigFile = `${target}/kontinuous.yaml`
      if (await fs.pathExists(pluginConfigFile)) {
        const pluginConfig = yaml.load(await fs.readFile(pluginConfigFile))
        mergeDefinition = deepmerge({}, pluginConfig, mergeDefinition)
      }

      Object.assign(definition, mergeDefinition)
    },
  })
}
