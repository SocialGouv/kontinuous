const fs = require("fs-extra")
const kebabCase = require("lodash.kebabcase")

const recurseDependencies = require("helm-tree/dependencies/recurse")
const yaml = require("../utils/yaml")
const deepmerge = require("../utils/deepmerge")
const degitImproved = require("../utils/degit-improved")
const normalizeDegitUri = require("../utils/normalize-degit-uri")
const removePrefix = require("../utils/remove-prefix")

const copyFilter = require("./copy-filter")

module.exports = async (config, logger) => {
  logger.debug("🔻 load dependencies")
  await recurseDependencies({
    config,
    beforeChildren: async ({ target, definition, scope, name }) => {
      const { links = {}, remoteLinks = {} } = config

      let { import: importTarget } = definition
      if (importTarget && !(await fs.pathExists(target))) {
        importTarget = normalizeDegitUri(importTarget)
        const lowerImportTarget = importTarget.toLowerCase()
        const hasAbsoluteRef = !(
          importTarget.includes("@") || importTarget.includes("#")
        )
        const matchLink =
          hasAbsoluteRef &&
          Object.entries(links).find(([key]) =>
            lowerImportTarget.startsWith(key)
          )

        const matchRemoteLink =
          hasAbsoluteRef &&
          Object.entries(remoteLinks).find(([key]) =>
            lowerImportTarget.startsWith(key)
          )

        if (matchLink && matchRemoteLink) {
          logger.warn(
            `entry "${lowerImportTarget}" is in links (${matchLink[1]}) and remoteLinks (${matchRemoteLink[1]}), theses options are mutually exclusives when using same key(s) links will take precedence`
          )
        }

        if (matchLink) {
          const [linkKey, linkPath] = matchLink
          const from = linkPath + importTarget.substr(linkKey.length)
          await fs.ensureDir(target)
          logger.debug({ scope }, `➡️  copy ${name} from "${from}"`)
          await fs.copy(from, target, { filter: copyFilter })
        } else if (matchRemoteLink) {
          const matchRemoteLinkNormalized = matchRemoteLink[1].replace("@", "#")
          const [prefix, ref] = matchRemoteLinkNormalized.split("#")
          const degitNewUri =
            prefix +
            removePrefix(lowerImportTarget, prefix) +
            (ref ? `#${ref}` : "")
          await degitImproved(degitNewUri, target, {
            logger: logger.child({
              scope,
              name,
            }),
          })
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
