const fs = require("fs-extra")
const path = require("path")

const yaml = require("js-yaml")
const degit = require("degit")
const slug = require("~common/utils/slug")

const miniHash = require("~common/utils/mini-hash")
const { buildCtx } = require("./ctx")

const selfReference = "SocialGouv/kube-workflow/"

const requireUse = async (use) => {
  const logger = buildCtx.require("logger")
  const downloadingPromises = buildCtx.require("downloadingPromises")
  const { KW_BUILD_PATH: rootDir, KW_WORKSPACE_PATH: userDir, KW_KUBEWORKFLOW_PATH } =
    buildCtx.require("env")
  const useSlug = slug(use)
  use = use.replace("@", "#")
  let target = `${rootDir}/uses/${useSlug}`
  if (!downloadingPromises[useSlug]) {
    downloadingPromises[useSlug] = (async () => {
      if (use.startsWith(".") || use.startsWith("/")) {
        const src = `${userDir}/${use}`
        logger.debug(`import local ${src}`)
        await fs.copy(src, target)
      } else if (!use.includes("#") && use.startsWith(selfReference)) {
        const nativeJob = use.slice(selfReference.length)
        const dir = path.join(KW_KUBEWORKFLOW_PATH, nativeJob)
        logger.debug(`use native job: ${nativeJob}`)
        await fs.copy(dir, target)
      } else {
        logger.debug(`degit ${use}`)
        await degit(use,{force: true}).clone(target)
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
  values = {},
  Values = {},
  parentScope = [],
  parentWith = {},
  file = null
) {
  if (!values.runs){
    return
  }
  if(!Array.isArray(values.runs)){
    values.runs = Object.entries(values.runs).map(([name, run])=>{
      if(!run.name){
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

      const { target } = await requireUse(run.use)
      const runValues = yaml.load(
        await fs.readFile(target, { encoding: "utf-8" })
      )
      await compile(runValues, Values, scope, run.parentWith, target)
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
        newRun.with = run.with
        if (!newRun.needs) {
          newRun.needs = []
        }
        newRun.needs = newRun.needs.map((r2) => [scope[0], r2].join(".."))
        newRun.needs = [...new Set([...newRun.needs, ...run.needs])]
        if(run.stage){
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

module.exports = async (values) => {
  buildCtx.set("downloadingPromises", {})
  await Promise.all(
    Object.keys(values).map(async (key) => {
      if (key === "jobs" || key.startsWith("jobs-")) {
        await compile(values[key], values)
      }
    })
  )
}
