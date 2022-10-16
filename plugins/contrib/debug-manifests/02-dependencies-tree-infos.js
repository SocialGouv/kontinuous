const camelcase = require("lodash.camelcase")

const changeGroupPrefix = "kapp.k14s.io/change-group"
const changeRulePrefix = "kapp.k14s.io/change-rule"
const changeRuleValuePrefix = "upsert after upserting kontinuous/"

module.exports = async (manifests, _options, { ctx, utils }) => {
  const logger = ctx.require("logger")

  if (!(await utils.graphEasyExists())) {
    logger.debug(
      "unable to display dependencies diagram, graph-easy not available, skipping"
    )
    return
  }

  const flatDependencies = {}

  for (const manifest of manifests) {
    const annotations = manifest.metadata?.annotations
    if (!annotations) {
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
    const ccKey = camelcase(key)
    for (const dep of dependenciesSet) {
      const ccDep = camelcase(dep)
      if (ccDep !== ccKey) {
        uml.push(`${ccDep} -> ${ccKey};`)
      }
    }
  }

  if (uml.length === 0) {
    return
  }

  // test here https://dot-to-ascii.ggerganov.com/ https://github.com/ggerganov/dot-to-ascii
  // lib https://github.com/ironcamel/Graph-Easy
  const result = await utils.asyncShell("graph-easy", {}, (proc) => {
    proc.stdin.write(`digraph {
    rankdir=LR
    ${uml.join("\n")}
}`)
    proc.stdin.end()
  })
  logger.debug(`\n${result}`)
}
