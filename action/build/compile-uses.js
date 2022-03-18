const fs = require("fs-extra")

const yaml = require("js-yaml")
const { generate } = require("@socialgouv/env-slug")
const degit = require("degit")

const miniHash = require("./utils/miniHash")
const { buildCtx } = require("./ctx")

const downloadingPromises = {}

const requireUse = async (use) => {
  const logger = buildCtx.require("logger")
  const { KWBUILD_PATH: rootDir, WORKSPACE_PATH: userDir } =
    buildCtx.require("env")
  const slug = generate(use)
  use = use.replace("@", "#")
  let target = `${rootDir}/uses/${slug}`
  if (!downloadingPromises[slug]) {
    downloadingPromises[slug] = (async () => {
      if (use.startsWith(".") || use.startsWith("/")) {
        const src = `${userDir}/${use}`
        logger.debug(`import local ${src}`)
        await fs.copy(src, target)
      } else {
        logger.debug(`degit ${use}`)
        await degit(use).clone(target)
      }
    })()
  }
  await downloadingPromises[slug]
  if ((await fs.stat(target)).isDirectory()) {
    target += "/use.yaml"
  }
  return { slug, use, target }
}

async function compile({ values, file }, parentScope = [], parentWith = {}) {
  if (file) {
    values = yaml.load(await fs.readFile(file, { encoding: "utf-8" }))
  }
  if (!values) {
    return values
  }
  const runs = values.jobs?.runs || values.runs || []
  const newRuns = []
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i]

    if (!run.name) {
      run.name = miniHash(file)
    }
    if (!run.with) {
      run.with = {}
    }

    const scope = [...parentScope, run.name]
    run.scope = scope
    const scopes = []
    const currentScope = []
    for (const sc of scope) {
      currentScope.push(sc)
      scopes.push(currentScope.join("."))
    }
    if (scope.length > 1) {
      scopes.push([scope[0], scope[scope.length - 1]].join(".."))
    }
    run.scopes = scopes
    run.parentWith = { ...parentWith, ...run.with }

    if (!run.needs) {
      run.needs = []
    }
    run.needs = run.needs.map((r) => [scope[0], r].join(".."))

    if (!run.use) {
      newRuns.push(run)
      continue
    }

    const { target } = await requireUse(run.use)
    const compiled = await compile({ file: target }, scope, run.parentWith)
    if (compiled.runs) {
      const flat = compiled.runs.map((r) => ({
        action: run.use,
        ...Object.entries(r).reduce((acc, [key, value]) => {
          if (key !== "use") {
            acc[key] = value
          }
          return acc
        }, {}),
        with: run.with,
      }))
      newRuns.push(...flat)
    }
  }
  runs.length = 0
  runs.push(...newRuns)
  return values
}

module.exports = async (values) => {
  return compile({ values })
}
