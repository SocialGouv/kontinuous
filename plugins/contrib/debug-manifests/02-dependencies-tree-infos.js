const getDeps = require("../lib/get-needs-deps")
const getDepName = require("../lib/get-needs-dep-name")
const kindIsWaitable = require("../lib/kind-is-waitable")

module.exports = async (manifests, options, context) => {
  const { ctx, utils } = context

  const logger = ctx.require("logger")

  if (!(await utils.graphEasyExists())) {
    logger.debug(
      "unable to display dependencies diagram, graph-easy (libgraph-easy-perl) not available, skipping"
    )
    return
  }

  const deps = getDeps(manifests, options, context)

  const umlSet = new Set()

  for (const manifest of manifests) {
    const { metadata, kind } = manifest
    const annotations = metadata?.annotations
    if (!annotations) {
      continue
    }

    const jsonNeeds = annotations["kontinuous/plugin.needs"]

    if (!kindIsWaitable(kind, options.customWaitableKinds)) {
      continue
    }

    const dependantName = getDepName(manifest)

    umlSet.add(`${dependantName};`)

    if (!jsonNeeds) {
      continue
    }
    const needs = JSON.parse(jsonNeeds)

    for (const need of needs) {
      const matchingDeps = deps[need]
      for (const m of matchingDeps) {
        const dependencyName = getDepName(m)
        if (dependantName !== dependencyName) {
          umlSet.add(`${dependencyName} -> ${dependantName};`)
        }
      }
    }
  }

  const uml = [...umlSet]

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

  logger.debug(`🌳 dependencies tree:`)

  const log = logger.child({}, { indentation: 3 })
  log.setFields({})

  result.split("\n").forEach((line) => {
    log.debug(line)
  })
}
