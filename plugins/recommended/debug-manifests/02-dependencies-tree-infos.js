const path = require("path")
const camelcase = require("lodash.camelcase")
const fs = require("fs-extra")

const changeGroupPrefix = "kapp.k14s.io/change-group"
const changeRulePrefix = "kapp.k14s.io/change-rule"
const changeRuleValuePrefix = "upsert after upserting kontinuous/"

module.exports = async (manifests, _options, { ctx, utils }) => {
  const logger = ctx.require("logger")

  if (!(await utils.javaExists())) {
    logger.debug(
      "unable to display dependencies diagram, java not available, skipping"
    )
    return
  }

  const flatDependencies = {}

  for (const manifest of manifests) {
    const annotations = manifest.metadata?.annotations
    if (!annotations || !annotations[changeGroupPrefix]) {
      continue
    }

    let depKey = Object.keys(annotations).find((key) =>
      key.startsWith(`${changeGroupPrefix}.`)
    )
    if (!depKey) {
      continue
    }
    depKey = depKey.split(".").pop()

    for (const [key, value] of Object.entries(annotations)) {
      if (
        (key === changeRulePrefix || key.startsWith(`${changeRulePrefix}.`)) &&
        value.startsWith(changeRuleValuePrefix)
      ) {
        if (!flatDependencies[depKey]) {
          flatDependencies[depKey] = new Set()
        }
        let dep = value.slice(changeRuleValuePrefix.length)
        dep = dep.split(".").shift()
        dep = camelcase(dep)
        flatDependencies[depKey].add(dep)
      }
    }
  }

  const uml = []
  for (const [key, dependenciesSet] of Object.entries(flatDependencies)) {
    for (const dep of dependenciesSet) {
      if (dep !== key) {
        uml.push(`${dep} -> ${camelcase(key)}`)
      }
    }
  }

  if (uml.length === 0) {
    return
  }

  const rootPluginDir = path.resolve(`${__dirname}/..`)

  const platform = process.platform === "darwin" ? "macosx" : process.platform
  const binSourceDir = `${rootPluginDir}/node_modules/puml/bin/${platform}`
  const binTargetDir = `${rootPluginDir}/node_modules/node-plantuml/vendor`
  await fs.ensureDir(binTargetDir)

  const symlinkMap = {
    [`${binTargetDir}/j2v8_${platform}_x86_64-3.1.6.jar`]: `${binSourceDir}/j2v8_${platform}_x86_64-3.1.6.jar`,
    [`${binTargetDir}/plantuml.jar`]: `${binSourceDir}/plantuml.jar`,
    [`${binTargetDir}/vizjs.jar`]: `${binSourceDir}/vizjs.jar`,
  }
  await Promise.all(
    Object.entries(symlinkMap).map(async ([key, value]) => {
      if (!(await fs.pathExists(key))) {
        await fs.symlink(value, key)
      }
    })
  )

  const result = await utils.asyncShell(
    [
      "node_modules/node-plantuml/index.js",
      "generate",
      "--unicode",
      "--text",
      uml.join("\n"),
    ],
    {
      cwd: rootPluginDir,
    }
  )

  logger.debug(`\n${result}`)
}
