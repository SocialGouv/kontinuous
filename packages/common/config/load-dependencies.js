const fs = require("fs-extra")

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
        const matchLink = Object.entries(links).find(([key]) =>
          importTarget.startsWith(key)
        )
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
      const pluginConfigFile = `${target}/kontinuous.yaml`
      if (await fs.pathExists(pluginConfigFile)) {
        const pluginConfig = yaml.load(await fs.readFile(pluginConfigFile))
        Object.assign(definition, deepmerge({}, pluginConfig, definition))
      }
    },
  })
}
