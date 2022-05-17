const path = require("path")
const fs = require("fs-extra")

const degit = require("tiged")
const yaml = require("js-yaml")

const slug = require("./utils/slug")
const miniHash = require("./utils/mini-hash")

const selfReference = "SocialGouv/kontinuous/"

const requireUse = async (use, { config, logger, downloadingPromises }) => {
  const { buildPath, workspacePath, workspaceSubPath } = config
  const useSlug = slug(use)
  use = use.replace("@", "#")
  let target = `${buildPath}/uses/${useSlug}`
  const { links } = config
  if (!downloadingPromises[useSlug]) {
    downloadingPromises[useSlug] = (async () => {
      if (use.startsWith(".") || use.startsWith("/")) {
        const src = `${workspacePath}/${use}`
        logger.debug(`import local ${src}`)
        await fs.copy(src, target)
      } else if (!use.includes("#") && use.startsWith(selfReference)) {
        const nativeJob = use.slice(selfReference.length)
        const dir = path.join(workspaceSubPath, nativeJob)
        logger.debug(`use native job: ${nativeJob}`)
        await fs.copy(dir, target)
      } else if (
        !use.includes("#") &&
        Object.keys(links).some((key) => use.startsWith(key))
      ) {
        const [_, linkPath] = Object.entries(links).find(([key]) =>
          use.startsWith(key)
        )
        logger.debug(`use linked job: ${use} -> ${linkPath}`)
        await fs.copy(linkPath, target)
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
  values = {},
  Values = {},
  parentScope = [],
  parentWith = {},
  file = null,
  downloadingPromises = {}
) {
  if (!values.runs) {
    return
  }
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

      console.log([
        "job",
        Values.global.repositoryName,
        [Values.global.gitBranch, 30],
        currentScope.join("--"),
      ])
      const jobName = slug([
        "job",
        Values.global.repositoryName,
        [Values.global.gitBranch, 30],
        currentScope.join("--"),
      ])
      run.jobName = jobName

      if (!run.use) {
        return [run]
      }

      const { config, logger } = context
      const { target } = await requireUse(run.use, {
        config,
        logger,
        downloadingPromises,
      })
      const runValues = yaml.load(
        await fs.readFile(target, { encoding: "utf-8" })
      )
      await compile(
        context,
        runValues,
        Values,
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

module.exports = async (values, _options, context) => {
  console.log({ values })
  await Promise.all(
    Object.values(values).map(async (values) => {
      // console.log(values)
      // if (key === "jobs" || key.startsWith("jobs-")) {
      //   await compile(context, values[key], values)
      // }
    })
  )
}
