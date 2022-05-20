const path = require("path")

const miniHash = require("./utils/mini-hash")

const selfReference = "SocialGouv/kontinuous/"

const requireUse = async (
  use,
  { config, logger, downloadingPromises, utils }
) => {
  const { slug, degit, fs } = utils
  const { buildPath, workspacePath, workspaceKsPath } = config
  const useSlug = slug(use)
  use = use.replace("@", "#")
  let target = `${buildPath}/uses/${useSlug}`
  const { links = {} } = config
  if (!downloadingPromises[useSlug]) {
    downloadingPromises[useSlug] = (async () => {
      if (use.startsWith(".") || use.startsWith("/")) {
        const src = `${workspacePath}/${use}`
        logger.debug(`import local ${src}`)
        await fs.copy(src, target)
      } else if (!use.includes("#") && use.startsWith(selfReference)) {
        const nativeJob = use.slice(selfReference.length)
        const dir = path.join(workspaceKsPath, nativeJob)
        logger.debug(`use native job: ${nativeJob}`)
        await fs.copy(dir, target)
      } else if (
        !use.includes("#") &&
        Object.keys(links).some((key) => use.startsWith(key))
      ) {
        const [linkKey, linkPath] = Object.entries(links).find(([key]) =>
          use.startsWith(key)
        )
        const from = linkPath + use.substr(linkKey.length)
        logger.debug(`use linked job: ${use} -> ${linkPath}`)
        await fs.copy(from, target)
      } else {
        logger.debug(`degit ${use}`)
        await degit(use, { force: true }).clone(target)
      }
    })()
  }
  await downloadingPromises[useSlug]
  if ((await fs.stat(target)).isDirectory()) {
    target += "/use.yaml"
  }
  return { slug: useSlug, use, target }
}

async function compile(
  context,
  values,
  parentScope = [],
  parentWith = {},
  file = null,
  downloadingPromises = {}
) {
  if (!values.runs) {
    return
  }
  const { config, utils } = context
  const { slug, yaml, fs } = utils
  if (!Array.isArray(values.runs)) {
    values.runs = Object.entries(values.runs).map(([name, run]) => {
      if (!run.name) {
        run.name = name
      }
      return run
    })
  }
  const newRuns = await Promise.all(
    values.runs.map(async (run) => {
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

      const { gitRepository, gitBranch } = config
      const repositoryName = path.basename(gitRepository)

      const jobName = slug([
        "job",
        repositoryName,
        [gitBranch, 30],
        currentScope.join("--"),
      ])
      run.jobName = jobName

      if (!run.use) {
        return [run]
      }

      const { target } = await requireUse(run.use, {
        ...context,
        downloadingPromises,
      })
      const runValues = yaml.load(
        await fs.readFile(target, { encoding: "utf-8" })
      )
      await compile(
        context,
        runValues,
        scope,
        run.parentWith,
        target,
        downloadingPromises
      )
      if (!runValues.runs) {
        return []
      }
      return runValues.runs.map((r) => {
        const newRun = {
          action: run.use,
        }
        for (const key of Object.keys(r)) {
          if (key === "use") {
            continue
          }
          newRun[key] = r[key]
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
        for (const key of Object.keys(run)) {
          if (jobRunOmitKeys.includes(key)) {
            continue
          }
          newRun[key] = run[key]
        }
        if (!newRun.needs) {
          newRun.needs = []
        }
        newRun.needs = newRun.needs.map((r2) => [scope[0], r2].join(".."))
        newRun.needs = [...new Set([...newRun.needs, ...run.needs])]
        if (run.stage) {
          newRun.stage = run.stage
        }
        return newRun
      })
    })
  )
  values.runs = newRuns.reduce((acc, run) => {
    acc.push(...run)
    return acc
  }, [])
}

module.exports = async (values, _options, context, scope) => {
  const jobsAlias = `${scope.join(".")}.jobs`
  await Promise.all(
    Object.values(values).map(async (subValues) => {
      if (subValues._aliasOf === jobsAlias) {
        await compile(context, subValues)
      }
    })
  )
  return values
}
