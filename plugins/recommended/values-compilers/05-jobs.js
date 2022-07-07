// const micromatch = require("micromatch")

const requireUse = async (
  use,
  { config, logger, downloadingPromises, utils }
) => {
  const { slug, degitImproved, fs, ignoreYarnState, normalizeDegitUri } = utils
  const { buildPath, workspacePath } = config
  const useSlug = slug(use)
  use = normalizeDegitUri(use)
  let target = `${buildPath}/uses/${useSlug}`
  const { links = {} } = config
  if (!downloadingPromises[useSlug]) {
    downloadingPromises[useSlug] = (async () => {
      if (use.startsWith(".") || use.startsWith("/")) {
        const src = `${workspacePath}/${use}`
        logger.debug(`import local ${src}`)
        await fs.copy(src, target, {
          filter: ignoreYarnState,
        })
      } else if (
        !use.includes("#") &&
        Object.keys(links).some((key) => use.startsWith(key))
      ) {
        const [linkKey, linkPath] = Object.entries(links).find(([key]) =>
          use.startsWith(key)
        )
        const from = linkPath + use.substr(linkKey.length)
        logger.debug(`use linked job: ${use} -> ${linkPath}`)
        await fs.copy(from, target, {
          filter: ignoreYarnState,
        })
      } else {
        logger.debug(`degit ${use}`)
        await degitImproved(use, target, { logger, force: true })
      }
    })()
  }
  await downloadingPromises[useSlug]
  if ((await fs.stat(target)).isDirectory()) {
    target += "/use.yaml"
  }
  return { slug: useSlug, use, target }
}

const runsArrayToMap = (runs) => {
  if (!Array.isArray(runs)) {
    return runs || {}
  }
  return runs.reduce((acc, run, i) => {
    let { name } = run
    if (!name) {
      name = i
      run.name = name
    }
    acc[name] = run
    return acc
  }, {})
}

async function compile(context, values, parentScope = [], parentWith = {}) {
  values.runs = runsArrayToMap(values.runs)

  const { config, utils } = context
  const { gitBranch, gitRepositoryName: repositoryName } = config
  const { slug, yaml, fs } = utils

  // const { changedPaths } = config
  // for (const [key, run] of Object.entries(values.runs)) {
  //   let { paths } = run
  //   if (paths) {
  //     if (!Array.isArray(paths)) {
  //       paths = [paths]
  //     }
  //     if (!changedPaths.some((p) => micromatch.isMatch(p, paths))) {
  //       delete values.runs[key]
  //     }
  //   }
  // }

  const newRuns = {}
  for (const [key, run] of Object.entries(values.runs)) {
    if (!run.name) {
      run.name = key
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

    run.jobName = slug([
      "job",
      repositoryName,
      [gitBranch, 30],
      currentScope.join("--"),
    ])

    if (!run.use) {
      newRuns[key] = run
    } else {
      newRuns[key] = { enabled: false }
      const { target } = await requireUse(run.use, context)
      const runValues = yaml.load(
        await fs.readFile(target, { encoding: "utf-8" })
      )
      await compile(context, runValues, scope, run.parentWith)

      for (const [runKey, r] of Object.entries(runValues.runs)) {
        const newRun = {
          action: run.use,
        }
        for (const k of Object.keys(r)) {
          if (k === "use") {
            continue
          }
          newRun[k] = r[k]
        }
        const jobRunOmitKeys = [
          "use",
          "name",
          "jobName",
          "needs",
          "scope",
          "scopes",
          "parentWith",
        ]
        for (const k of Object.keys(run)) {
          if (jobRunOmitKeys.includes(k)) {
            continue
          }
          newRun[k] = run[k]
        }
        if (!newRun.needs) {
          newRun.needs = []
        }
        newRun.needs = newRun.needs.map((r2) => [scope[0], r2].join(".."))
        newRun.needs = [...new Set([...newRun.needs, ...run.needs])]
        if (run.stage) {
          newRun.stage = run.stage
        }
        const subKey = [key, runKey].join(".")
        newRun.name = subKey
        newRuns[subKey] = newRun
      }
    }
  }
  values.runs = newRuns
}

const compileValues = async (values, context) => {
  await Promise.all(
    Object.values(values).map(async (subValues) => {
      if (
        typeof subValues !== "object" ||
        subValues === null ||
        Array.isArray(subValues)
      ) {
        return
      }
      if (subValues._pluginValuesCompilerRecommendedJobs) {
        await compile(context, subValues)
      } else {
        await compileValues(subValues, context)
      }
    })
  )
}

module.exports = async (values, _options, context, _scope) => {
  context = { ...context, downloadingPromises: {} }
  await compileValues(values, context)
  return values
}
