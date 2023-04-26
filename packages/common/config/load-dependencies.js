const fs = require("fs-extra")
const kebabCase = require("lodash.kebabcase")

const recurseDependencies = require("helm-tree/dependencies/recurse")
const yaml = require("../utils/yaml")
const deepmerge = require("../utils/deepmerge")
const degitImproved = require("../utils/degit-improved")
const normalizeDegitUri = require("../utils/normalize-degit-uri")
const matchLinkRemap = require("../utils/match-link-remap")

const copyFilter = require("./copy-filter")
const loadGitOrgConfig = require("./load-git-org-config")

module.exports = async (config, logger, reloadConfig) => {
  logger.debug("🔻 load dependencies")

  config = await loadGitOrgConfig(config, reloadConfig)

  await recurseDependencies({
    config,
    beforeChildren: async ({ target, definition, scope, name }) => {
      const { links = {}, remoteLinks = {} } = config

      let { import: importTarget } = definition
      if (importTarget && !(await fs.pathExists(target))) {
        importTarget = normalizeDegitUri(importTarget)

        const matchRemoteLink = matchLinkRemap(importTarget, remoteLinks)
        if (matchRemoteLink) {
          importTarget = matchRemoteLink
        }
        const matchLink = matchLinkRemap(importTarget, links)

        if (matchLink) {
          await fs.ensureDir(target)
          logger.debug({ scope }, `➡️  copy ${name} from "${matchLink}"`)
          await fs.copy(matchLink, target, { filter: copyFilter })
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

  return config
}
