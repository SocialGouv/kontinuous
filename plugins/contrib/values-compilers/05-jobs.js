const path = require("path")

const fs = require("fs-extra")

const omit = require("lodash.omit")
// const pick = require("lodash.pick")
const defaults = require("lodash.defaults")

const recurseLocate = async (
  jobName,
  dependencies,
  config,
  scope = ["project"]
) => {
  for (const [name, dependency] of Object.entries(dependencies)) {
    const childScope = [...scope, name]
    const jobPath = path.join(
      config.buildPath,
      ...childScope.flatMap((chart) => ["charts", chart]),
      "jobs",
      jobName
    )
    if (await fs.pathExists(jobPath)) {
      let dependencyUrl = dependency.import
      dependencyUrl = dependencyUrl.replace("@", "#")
      let dependencyRef = ""
      if (dependencyUrl.includes("#")) {
        const parts = dependencyUrl.split("#")
        dependencyRef = `#${parts.pop()}`
        dependencyUrl = parts.join("#")
      }
      const use = `${dependencyUrl}/jobs/${jobName}${dependencyRef}`
      return { use, jobPath }
    }
    if (dependency.dependencies) {
      const found = await recurseLocate(
        jobName,
        dependency.dependencies,
        config,
        childScope
      )
      if (found) {
        return found
      }
    }
  }
}

const remapValues = (run, context) => {
  const { options } = context
  if (run["~needs"]) {
    run.needs = run["~needs"]
    delete run["~needs"]
  }

  const { kubernetesMethod = "kubeconfig" } = options
  run.kubernetesMethod = kubernetesMethod
  if (kubernetesMethod === "serviceaccount") {
    const { serviceAccountName = "kontinuous-sa" } = options
    run.serviceAccountName = serviceAccountName
  }
}

const useIsInPlugins = (use) => use.startsWith("~") || !use.includes("/")
const locateUseInPlugins = async (use, config) => {
  const lowerUse = use.toLowerCase()
  const found = await recurseLocate(
    lowerUse.startsWith("~") ? lowerUse.slice(1) : lowerUse,
    config.dependencies,
    config
  )
  return found
}

const requireUse = async (
  run,
  { config, logger, downloadingPromises, utils }
) => {
  let { use } = run

  const {
    slug,
    degitImproved,
    ignoreYarnState,
    normalizeDegitUri,
    KontinuousPluginError,
  } = utils

  const { buildPath, workspacePath } = config

  const useSlug = slug(use)
  use = normalizeDegitUri(use)

  let target = `${buildPath}/uses/${useSlug}`
  const { links = {} } = config

  const lowerUse = use.toLowerCase()

  if (!downloadingPromises[useSlug]) {
    downloadingPromises[useSlug] = (async () => {
      if (use.startsWith(".") || use.startsWith("/")) {
        const src = `${workspacePath}/${use}`
        logger.debug(`🗂️  use project job: ${src}`)
        await fs.copy(src, target, {
          filter: ignoreYarnState,
        })
      } else if (useIsInPlugins(use)) {
        const found = await locateUseInPlugins(use, config)
        if (!found) {
          throw new KontinuousPluginError(
            `job "${use}" not found in repo dependencies`
          )
        }
        logger.debug(`🗂️  use plugin job: ${found.jobPath}`)
        await fs.copy(found.jobPath, target, {
          filter: ignoreYarnState,
        })
        use = found.use
        run.use = use
      } else if (
        !use.includes("#") &&
        Object.keys(links).some((key) => lowerUse.startsWith(key))
      ) {
        const [linkKey, linkPath] = Object.entries(links).find(([key]) =>
          lowerUse.startsWith(key)
        )
        const from = linkPath + use.substr(linkKey.length)
        logger.debug(`🗂️  use linked job: ${use}`)
        await fs.copy(from, target, {
          filter: ignoreYarnState,
        })
      } else {
        logger.debug(`🗂️  degit job: ${use}`)
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

const compileRun = async (key, run, compileCommon) => {
  const { context, chartScope, parentScope, parentWith, newRuns } =
    compileCommon
  const { config, logger, utils } = context
  const { gitBranch, gitRepositoryName: repositoryName, links } = config
  const { slug, yaml } = utils

  if (!run.name) {
    run.name = key
  }
  if (!run.with) {
    run.with = {}
  }

  if (!run.labels) {
    run.labels = {}
  }
  Object.assign(run.labels, {
    repository: repositoryName,
    ref: slug(gitBranch),
    environment: config.environment,
    ...(run.use ? {} : {}),
  })
  run.labels.runName = run.use
    ? slug(
        run.use
          .replace("@", "#")
          .split("#")
          .shift()
          .split("/")
          .pop()
          .replace("~", "")
      )
    : "custom"

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

  const chartJobsKey = [...chartScope].reverse().join("-")

  run.jobName = slug([
    "job",
    [repositoryName, 24],
    [gitBranch, 16],
    [chartJobsKey, 16],
    currentScope.join("--"),
  ])
  run.needsNames = [slug([[chartJobsKey, 16]]), ...scopes]

  remapValues(run, context)

  if (!run.use) {
    newRuns[key] = run
  } else {
    newRuns[key] = { enabled: false }
    const { target } = await requireUse(run, context)
    const runValues = yaml.load(
      await fs.readFile(target, { encoding: "utf-8" })
    )

    // eslint-disable-next-line no-use-before-define
    await compile(context, runValues, chartScope, scope, run.parentWith)

    for (const [runKey, r] of Object.entries(runValues.runs)) {
      remapValues(r, context)
      let action
      if (useIsInPlugins(run.use)) {
        const found = await locateUseInPlugins(run.use, config)
        logger.debug(`🗂️  use plugin action: ${found.jobPath}`)
        action = found.use
        run.localActionPath = found.jobPath
      } else {
        action = run.use
        const lowerAction = action.toLowerCase()
        if (
          !action.includes("#") &&
          Object.keys(links).some((lk) => lowerAction.startsWith(lk))
        ) {
          const [linkKey, linkPath] = Object.entries(links).find(([lk]) =>
            lowerAction.startsWith(lk)
          )
          const from = linkPath + action.substr(linkKey.length)
          logger.debug(`🗂️  use linked action: ${from}`)
          run.localActionPath = from
        }
      }
      const newRun = {
        action,
      }

      Object.assign(newRun, omit(r, ["use"]))

      Object.assign(
        newRun,
        omit(run, [
          "use",
          "name",
          "jobName",
          "needs",
          "scope",
          "scopes",
          "parentWith",
        ])
      )

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

async function compile(
  context,
  values,
  chartScope,
  parentScope = [],
  parentWith = {}
) {
  const newRuns = {}
  const compileCommon = {
    context,
    chartScope,
    parentScope,
    parentWith,
    newRuns,
  }

  values.runs = runsArrayToMap(values.runs)
  for (const [key, run] of Object.entries(values.runs)) {
    await compileRun(key, run, compileCommon)
  }
  values.runs = newRuns
}

const compileMulti = async (context, values, chartScope) => {
  await compile(context, values, chartScope)
}

const compileSingle = async (context, values, chartScope) => {
  await compile(context, values, chartScope)
  const key = chartScope[chartScope.length - 1]
  const run = omit(values, [
    "_pluginValuesCompilerContribJob",
    "_pluginValuesCompilerContribJobs",
    "runs",
    "enabled",
    "_isProjectValues",
    "_isChartValues",
    "~chart",
    "~chart-group",
  ])
  // const run = pick(values, [
  //   "use",
  //   "with",
  //   "run",
  //   "image",
  //   "checkout",
  //   "action",
  //   "envFrom",
  //   "volumeMounts",
  //   "volumes",
  //   "env",
  //   "vars",
  //   "workingDir",
  //   "cpuLimit",
  //   "cpuRequest",
  //   "memoryLimit",
  //   "memoryRequest",
  //   "user",
  //   "group",
  //   "fsGroup",
  //   "jobName",
  //   "namespace",
  //   "name",
  //   "stage",
  //   "onChangedPaths",
  //   "onChangedNeeds",
  //   "onChangedAnnotate",
  //   "retry",
  //   "activeDeadlineSeconds",
  //   "annotations",
  //   "labels",
  //   "priorityClassName",
  //   "kubernetes",
  //   "kubernetesMethod",
  //   "serviceAccountName",
  //   "degitRepositoryCpuLimit",
  //   "degitRepositoryMemoryLimit",
  //   "degitRepositoryCpuRequest",
  //   "degitRepositoryMemoryRequest",
  //   "degitActionCpuLimit",
  //   "degitActionMemoryLimit",
  //   "degitActionCpuRequest",
  //   "degitActionMemoryRequest",
  // ])
  values.runs = {
    [key]: run,
  }
  await compile(context, values, chartScope)
  defaults(values, values.defaults)
}

const compileJobsValues = async (values, context, chartScope, chartConf) => {
  if (!values.enabled) {
    return
  }
  const { config } = context
  if (config.deployKeySecretEnabled) {
    if (!values.deployKey) {
      values.deployKey = {}
    }
    values.deployKey.enabled = true
    if (config.deployKeySecretName) {
      values.deployKey.secretRefName = config.deployKeySecretName
    }
  }
  if (chartConf.isJob) {
    await compileSingle(context, values, chartScope)
  } else {
    await compileMulti(context, values, chartScope)
  }
}

const compileValues = async (values, context, chartScope = []) => {
  await Promise.all(
    Object.entries(values).map(async ([key, subValues]) => {
      if (
        typeof subValues !== "object" ||
        subValues === null ||
        Array.isArray(subValues)
      ) {
        return
      }
      const childChartScope = [...chartScope, key]
      const isJob = subValues._pluginValuesCompilerContribJob
      const isJobs = subValues._pluginValuesCompilerContribJobs
      if (isJob || isJobs) {
        const chartConf = { isJob, isJobs }
        await compileJobsValues(subValues, context, childChartScope, chartConf)
      } else {
        await compileValues(subValues, context, childChartScope)
      }
    })
  )
}

module.exports = async (values, options, context, _scope) => {
  context = { ...context, downloadingPromises: {}, options }
  await compileValues(values, context)
  return values
}
