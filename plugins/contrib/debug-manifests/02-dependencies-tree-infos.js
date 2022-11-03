const camelcase = require("lodash.camelcase")

const getDeps = require("../lib/get-needs-deps")

module.exports = async (manifests, _options, context) => {
  const { ctx, utils } = context

  const logger = ctx.require("logger")

  if (!(await utils.graphEasyExists())) {
    logger.debug(
      "unable to display dependencies diagram, graph-easy not available, skipping"
    )
    return
  }

  const { kindIsRunnable } = utils

  const deps = getDeps(manifests, context)

  const umlSet = new Set()

  const getDepName = (manifest) => {
    const { metadata } = manifest
    const annotations = metadata?.annotations

    const name =
      annotations["kontinuous/needsName"] ||
      annotations["kontinuous/depname.chartName"]

    return camelcase(name)
  }

  for (const manifest of manifests) {
    const { metadata, kind } = manifest
    const annotations = metadata?.annotations
    if (!annotations) {
      continue
    }

    const jsonNeeds = annotations["kontinuous/plugin.needs"]

    if (!kindIsRunnable(kind)) {
      continue
    }

    if (!jsonNeeds) {
      continue
    }
    const needs = JSON.parse(jsonNeeds)

    const dependantName = getDepName(manifest)

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
  logger.debug(`\n${result}`)
}
