const path = require("path")

const fs = require("fs-extra")
const camelCase = require("lodash.camelcase")
const get = require("lodash.get")
const set = require("lodash.set")
const { default: axios } = require("axios")
const decompress = require("decompress")

const yaml = require("~common/utils/yaml")
const deepmerge = require("~common/utils/deepmerge")
const createChart = require("~common/utils/create-chart")
const loadYamlFile = require("~common/utils/load-yaml-file")
const downloadFile = require("~common/utils/download-file")
const getYamlPath = require("~common/utils/get-yaml-path")
const yarnInstall = require("~common/utils/yarn-install")
const fileHash = require("~common/utils/file-hash")
const degitImproved = require("~common/utils/degit-improved")
const slug = require("~common/utils/slug")
const normalizeDegitUri = require("~common/utils/normalize-degit-uri")

const createContext = require("~/plugins/context")
const configDependencyKey = require("~/plugins/context/config-dependency-key")

const copyFilter = require("./copy-filter")

const validateName = /^[a-zA-Z\d-_]+$/

const registerSubcharts = async (
  chart,
  chartsDirName,
  target,
  definition = {}
) => {
  const chartsDir = `${target}/${chartsDirName}`
  if (!(await fs.pathExists(chartsDir))) {
    return
  }
  const chartDirs = await fs.readdir(chartsDir)
  for (const chartDir of chartDirs) {
    const chartDirPath = `${chartsDir}/${chartDir}`
    if (!(await fs.stat(chartDirPath)).isDirectory()) {
      continue
    }
    if (definition.charts?.[configDependencyKey(chartDir)]?.enabled === false) {
      await fs.remove(chartDirPath)
      continue
    }

    const subchartFile = `${chartDirPath}/Chart.yaml`
    if (!(await fs.pathExists(subchartFile))) {
      // eslint-disable-next-line no-use-before-define
      await buildChartFile(chartDirPath, chartDir, definition[chartDir])
    }
    const subchart = yaml.load(
      await fs.readFile(subchartFile, {
        encoding: "utf-8",
      })
    )
    const dependency = {
      name: subchart.name,
      version: subchart.version,
      repository: `file://./${chartsDirName}/${chartDir}`,
    }
    const definedDependencies = chart.dependencies.filter(
      (d) => d.name === subchart.name
    )
    if (definedDependencies.length > 0) {
      for (const definedDependency of definedDependencies) {
        Object.assign(definedDependency, dependency)
      }
    } else {
      chart.dependencies.push(dependency)
    }
    if (subchart.type !== "library" && !dependency.condition) {
      dependency.condition = `${dependency.alias || dependency.name}.enabled`
    }
  }
}

const buildChartFile = async (target, name, definition = {}) => {
  const chartFile = `${target}/Chart.yaml`
  const chart = createChart(name)
  if (await fs.pathExists(chartFile)) {
    const extendChart = yaml.load(await fs.readFile(chartFile))
    Object.assign(chart, extendChart)
    chart.name = name
    for (const dep of chart.dependencies) {
      if (dep.condition) {
        continue
      }
      dep.condition = `${dep.alias || dep.name}.enabled`
    }
  }

  await registerSubcharts(chart, "charts", target, definition)

  chart.dependencies = chart.dependencies.filter(
    (dep) =>
      definition.charts?.[configDependencyKey(dep.name)]?.enabled !== false
  )

  await fs.ensureDir(target)
  await fs.writeFile(chartFile, yaml.dump(chart))
}

const downloadDependencyFromHelmRepo = async (
  dependency,
  target,
  config,
  _logger
) => {
  const { repository, version } = dependency
  const localArchive = `${target}/charts/${dependency.name}-${version}.tgz`
  let zfile
  if (await fs.pathExists(localArchive)) {
    zfile = localArchive
  } else {
    const cacheDir = `${config.kontinuousHomeDir}/cache/charts`
    const archiveSlug = slug([dependency.name, version, repository])
    zfile = `${cacheDir}/${archiveSlug}.tgz`
    if (!(await fs.pathExists(zfile))) {
      await fs.ensureDir(cacheDir)
      const chartRepository = `${repository}/index.yaml`
      let repositoryIndex
      try {
        repositoryIndex = await axios.get(chartRepository)
      } catch (e) {
        throw Error(`Unable to download ${chartRepository}: ${e.message}`)
      }
      const repo = yaml.load(repositoryIndex.data)
      const { entries } = repo
      const entryVersions = entries[dependency.name]
      const versionEntry = entryVersions.find(
        (entry) => entry.version.toString() === dependency.version.toString()
      )
      if (!versionEntry) {
        throw new Error(`version ${version} not found for ${dependency.name}`)
      }
      const url = versionEntry.urls[0]
      await downloadFile(url, zfile)
    }
  }

  await decompress(zfile, `${target}/charts`)

  let chartName = dependency.name
  if (dependency.alias) {
    chartName = dependency.alias
    await fs.rename(
      `${target}/charts/${dependency.name}`,
      `${target}/charts/${dependency.alias}`
    )
  }

  dependency.repository = `file://./charts/${chartName}`
}

const downloadDependencyFromGitRepo = async (
  dependency,
  target,
  _config,
  logger
) => {
  const { degit: degitUri } = dependency
  if (dependency.repository) {
    throw new Error(
      `repository and degit variable are mutually exclusive for chart dependency: ${JSON.stringify(
        dependency,
        null,
        2
      )}`
    )
  }
  const chartName = dependency.alias || dependency.name
  await degitImproved(degitUri, `${target}/charts/${chartName}`, {
    logger: logger.child({
      dependency,
    }),
  })
  dependency.repository = `file://./charts/${chartName}`
  delete dependency.degit
}

const downloadRemoteRepository = async (target, definition, config, logger) => {
  const chartFile = `${target}/Chart.yaml`
  const chart = yaml.load(await fs.readFile(chartFile))
  const { dependencies = [] } = chart
  let touched = false
  for (const dependency of dependencies) {
    let { degit: degitUri } = dependency
    if (degitUri) {
      degitUri = normalizeDegitUri(degitUri)
    }
    const { repository } = dependency

    if (degitUri) {
      await downloadDependencyFromGitRepo(dependency, target, config, logger)
      touched = true
    } else if (repository.startsWith("file://../")) {
      const { name } = dependency
      const chartDir = `${target}/charts`
      await fs.ensureDir(chartDir)
      const subchartPath = `${chartDir}/${name}`
      if (!(await fs.pathExists(subchartPath))) {
        await fs.symlink(`../${repository.slice(7)}`, subchartPath)
      }
      dependency.repository = `file://./charts/${name}`
      touched = true
    } else if (!repository.startsWith("file://")) {
      await downloadDependencyFromHelmRepo(dependency, target, config, logger)
      touched = true
    }
  }

  if (touched) {
    await fs.writeFile(chartFile, yaml.dump(chart))
  }

  for (const dependency of dependencies) {
    const name = dependency.alias || dependency.name
    const subchartDir = `${target}/charts/${dependency.name}`
    const subDefinition = definition[name] || {}
    await buildChartFile(subchartDir, name, subDefinition)
    await downloadRemoteRepository(subchartDir, subDefinition, config, logger)
  }
}

// see https://github.com/helm/helm/issues/7093#issuecomment-814003563
const setRelativeLinkVersions = async (target, definition, config, logger) => {
  const chartFile = `${target}/Chart.yaml`
  const chart = yaml.load(await fs.readFile(chartFile))
  const { dependencies = [] } = chart
  let touched = false
  for (const dependency of dependencies) {
    const { repository } = dependency
    if (repository.startsWith("file://.")) {
      const { name } = dependency
      const chartDir = `${target}/charts`
      const subchartPath = `${chartDir}/${name}`
      const subchart = yaml.load(
        await fs.readFile(`${subchartPath}/Chart.yaml`, { encoding: "utf-8" })
      )
      dependency.version = subchart.version
      touched = true
    }
  }

  if (touched) {
    await fs.writeFile(chartFile, yaml.dump(chart))
  }

  for (const dependency of dependencies) {
    const name = dependency.alias || dependency.name
    const subchartDir = `${target}/charts/${dependency.name}`
    const subDefinition = definition[name] || {}
    await setRelativeLinkVersions(subchartDir, subDefinition, config, logger)
  }
}

const buildJsFile = async (target, type, definition) => {
  const jsFile = `${target}/${type}/index.js`
  if (await fs.pathExists(jsFile)) {
    return
  }
  const processors = []

  const { dependencies = {} } = definition
  for (const name of Object.keys(dependencies)) {
    const indexFile = `../charts/${name}/${type}`
    processors.push(indexFile)
  }

  const typeKey = camelCase(type)
  let loads = definition[typeKey] || {}
  const typeDir = `${target}/${type}`

  const exts = [".js", ".ts"]
  if (await fs.pathExists(typeDir)) {
    const paths = await fs.readdir(typeDir)
    for (const p of paths) {
      let key
      if ((await fs.stat(`${typeDir}/${p}`)).isDirectory()) {
        if (!(await fs.pathExists(`${typeDir}/${p}/index.js`))) {
          continue
        }
        key = p
      } else {
        const ext = path.extname(p)
        if (!exts.includes(ext)) {
          continue
        }
        key = p.substring(0, p.length - ext.length)
      }
      key = configDependencyKey(key)
      if (!loads[key]) {
        loads[key] = {}
      }
      loads[key].require = `./${p}`
    }
  }

  loads = Object.entries(loads)
    .filter(([_key, value]) => value.enabled !== false)
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})

  for (const [name, load] of Object.entries(loads)) {
    let { require: req } = load
    if (!req) {
      req = `./${name}`
    }
    processors.push(req)
  }

  const jsSrc = `const processors = [${processors
    .map((p) => JSON.stringify(p))
    .join(",")}]
module.exports = async (data, _options, context, scope)=>{
  for(const inc of processors){
    data = await context.require(inc, scope)(data)
  }
  return data
}
`
  await fs.ensureDir(path.dirname(jsFile))
  await fs.writeFile(jsFile, jsSrc)
}

const recurseDependency = async (param = {}) => {
  const {
    name = "project",
    config,
    definition = config,
    beforeChildren = () => {},
    afterChildren = () => {},
  } = param

  const { buildPath } = config

  if (!validateName.test(name)) {
    throw new Error(
      `invalid import name format, expected only alphanumerics hyphens and underscores characters, received: "${name}"`
    )
  }

  const scope = [...(param.scope || []), name]
  const subpath = path.join(
    ...scope.reduce((acc, item) => {
      acc.push("charts", item)
      return acc
    }, [])
  )
  const target = `${buildPath}/${subpath}`

  const callbackParam = {
    name,
    definition,
    scope,
    config,
    target,
  }

  await beforeChildren(callbackParam)

  const { dependencies } = definition
  if (dependencies) {
    await Promise.all(
      Object.entries(dependencies).map(([childName, childDefinition]) =>
        recurseDependency({
          ...param,
          name: childName,
          definition: childDefinition,
          scope,
        })
      )
    )
  }

  await afterChildren(callbackParam)
}

const downloadAndBuildDependencies = async (config, logger) => {
  await recurseDependency({
    config,
    beforeChildren: async ({ target, definition, scope, name }) => {
      const { links = {} } = config

      let { import: importTarget } = definition
      if (importTarget) {
        importTarget = normalizeDegitUri(importTarget)
        const matchLink = Object.entries(links).find(([key]) =>
          importTarget.startsWith(key)
        )
        if (matchLink) {
          const [linkKey, linkPath] = matchLink
          const from = linkPath + importTarget.substr(linkKey.length)
          await fs.ensureDir(target)
          logger.debug({ scope }, `copy ${name} from "${from}"`)
          await fs.copy(from, target, { filter: copyFilter })
        } else {
          await degitImproved(importTarget, target, {
            logger: logger.child({
              scope,
              name,
            }),
          })
        }
      }

      // load config file
      const pluginConfigFile = `${target}/kontinuous.yaml`
      if (await fs.pathExists(pluginConfigFile)) {
        const pluginConfig = yaml.load(await fs.readFile(pluginConfigFile))
        Object.assign(definition, deepmerge({}, pluginConfig, definition))
      }
    },
    afterChildren: async ({ name, target, definition }) => {
      await buildChartFile(target, name, definition)
      await downloadRemoteRepository(target, definition, config, logger)
      await setRelativeLinkVersions(target, definition, config, logger)
      await buildJsFile(target, "values-compilers", definition)
      await buildJsFile(target, "debug-manifests", definition)
      await buildJsFile(target, "patches", definition)
      await buildJsFile(target, "validators", definition)
      await buildJsFile(target, "pre-deploy", definition)
      await buildJsFile(target, "post-deploy", definition)
    },
  })
}

const installPackages = async (config) => {
  await recurseDependency({
    config,
    afterChildren: async ({ target }) => {
      if (!(await fs.pathExists(`${target}/package.json`))) {
        return
      }

      let hash
      if (!(await fs.pathExists(`${target}/yarn.lock`))) {
        hash = await fileHash(`${target}/yarn.lock`)
      } else {
        hash = await fileHash(`${target}/package.json`)
      }

      const sharedDir = `${config.kontinuousHomeDir}/cache/shared-node_modules/${hash}/node_modules`

      await fs.ensureDir(sharedDir)
      fs.symlink(sharedDir, `${target}/node_modules`)

      await yarnInstall(target)
    },
  })
}

const beforeMergeChartValues = (values) => {
  values._isChartValues = true
}

const beforeMergeProjectValues = (values) => {
  beforeMergeChartValues(values)
  for (const [key, subValues] of Object.entries(values)) {
    if (key === "global") {
      continue
    }
    if (typeof subValues !== "object" || subValues === null) {
      continue
    }
    subValues._isProjectValues = true
  }
}

const cleanMetaValues = (values) => {
  if (typeof values !== "object" || values === null) {
    return
  }
  for (const key of Object.keys(values)) {
    if (key.startsWith("_")) {
      delete values[key]
    } else {
      cleanMetaValues(values[key])
    }
  }
}

const removeNotEnabledValues = (values) => {
  let hasEnabledValue
  for (const [key, val] of Object.entries(values)) {
    if (typeof val !== "object" || val === null) {
      continue
    }
    const childrenHasEnabledValue = removeNotEnabledValues(val)
    if (childrenHasEnabledValue && val.enabled !== false) {
      hasEnabledValue = true
      val.enabled = true
    }
    if (val._isChartValues && !val.enabled) {
      // delete values[key]
      values[key] = { enabled: false }
    }
  }
  return hasEnabledValue || (values._isChartValues && values.enabled)
}

const expandDotNotation = (o) => {
  if (Array.isArray(o)) {
    for (const value of o) {
      expandDotNotation(value)
    }
  } else {
    for (const [key, value] of Object.entries(o)) {
      if (key.slice(0, 1) === ".") {
        set(o, key.slice(1), value)
        delete o[key]
      }
      if (typeof value === "object" && value !== null) {
        expandDotNotation(value)
      }
    }
  }
}

const mergeYamlFileValues = async (
  valuesFileBasename,
  subValues,
  beforeMerge
) => {
  const val = (await loadYamlFile(valuesFileBasename)) || {}
  beforeMerge(val)
  expandDotNotation(val)
  deepmerge(subValues, val)
}

const mergeEnvTemplates = async (rootPath, config) => {
  const { environment } = config
  const envTemplatesPath = `${rootPath}/env/${environment}/templates`
  if (await fs.pathExists(envTemplatesPath)) {
    await fs.copy(envTemplatesPath, `${rootPath}/templates`, {
      dereference: true,
      filter: copyFilter,
    })
  }
}

const writeChartsAlias = async (chartsAliasMap, config) => {
  const { buildPath } = config
  for (const [scope, aliasMap] of chartsAliasMap.entries()) {
    const p = []
    for (const s of scope) {
      p.push("charts")
      p.push(s)
    }
    const chartFile = `${buildPath}/${path.join(...p)}/Chart.yaml`
    const chartContent = await fs.readFile(chartFile)
    const chart = yaml.load(chartContent)
    for (const [alias, name] of Object.entries(aliasMap)) {
      const aliasOf = chart.dependencies.find((dep) => dep.name === name)
      chart.dependencies.push({
        ...aliasOf,
        alias,
        condition: `${alias}.enabled`,
      })
    }
    await fs.writeFile(chartFile, yaml.dump(chart))
  }
}

const valuesEnableStandaloneCharts = (values, config) => {
  const hasAll = !(config.chart && config.chart.length > 0)
  values.global.kontinuous.hasChart = !hasAll
  values.global.kontinuous.hasAll = hasAll
  if (hasAll) {
    return
  }
  values.global.kontinuous.chart = config.chart
  for (const [key, val] of Object.entries(values)) {
    if (key === "project" || key === "global") {
      continue
    }
    if (typeof values[key] !== "object" || values[key] === null) {
      continue
    }
    val.enabled = false
  }
  const enableCharts = config.chart
  for (const key of enableCharts) {
    let v = get(values, key)
    if (typeof v !== "object" || v === null) {
      v = {}
      set(values, key, v)
    }
    v.enabled = true
  }
}
const valuesOverride = (values, config, logger) => {
  if (config.inlineValues) {
    const inlineValues = yaml.load(config.inlineValues)
    values = deepmerge(values, inlineValues)
  }

  const setValues = config.set
  if (setValues) {
    if (Array.isArray(setValues)) {
      for (const s of setValues) {
        const index = s.indexOf("=")
        if (index === -1) {
          logger.warn("bad format for --set option, expected: foo=bar")
          continue
        }
        const key = s.slice(0, index)
        const val = s.slice(index + 1)
        set(values, `${key}`, yaml.parse(val))
      }
    } else {
      for (const [key, val] of Object.entries(setValues)) {
        set(values, key, val)
      }
    }
  }
}

const mergeValuesFromDir = async ({
  values,
  target,
  definition,
  scope,
  config,
}) => {
  const { environment } = config

  const chartsPath = `${target}/charts`
  if (!(await fs.pathExists(chartsPath))) {
    return
  }
  const chart = yaml.load(
    await fs.readFile(`${target}/Chart.yaml`, { encoding: "utf-8" })
  )
  const { dependencies = [] } = chart

  const chartDirs = await fs.readdir(chartsPath)
  for (const subchartDir of chartDirs) {
    const subchartDirPath = `${chartsPath}/${subchartDir}`
    if (!(await fs.stat(subchartDirPath)).isDirectory()) {
      continue
    }

    const subchartScopes = []
    for (const dep of dependencies) {
      if (dep.name === subchartDir) {
        subchartScopes.push([...scope, dep.alias || dep.name])
      }
    }

    for (const subchartScope of subchartScopes) {
      const dotKey = subchartScope.join(".")
      let subValues = get(values, dotKey)
      if (!subValues) {
        subValues = {}
        set(values, dotKey, subValues)
      }

      await mergeValuesFromDir({
        values,
        target: subchartDirPath,
        definition: definition[subchartDir] || {},
        scope: subchartScope,
        config,
      })

      await mergeYamlFileValues(
        `${subchartDirPath}/values`,
        subValues,
        beforeMergeChartValues
      )

      await mergeYamlFileValues(
        `${subchartDirPath}/env/${environment}/values`,
        subValues,
        beforeMergeChartValues
      )

      await mergeEnvTemplates(subchartDirPath, config)

      if (definition.values) {
        deepmerge(subValues, definition.values)
      }
    }
  }
}

const compileValues = async (config, logger) => {
  let values = {}
  const { buildPath, environment } = config

  const buildProjectPath = `${buildPath}/charts/project`

  const scope = ["project"]

  await mergeValuesFromDir({
    values,
    target: buildProjectPath,
    definition: config,
    scope,
    config,
  })

  await mergeYamlFileValues(
    `${buildProjectPath}/values`,
    values,
    beforeMergeProjectValues
  )
  await mergeYamlFileValues(
    `${buildProjectPath}/env/${environment}/values`,
    values,
    beforeMergeProjectValues
  )

  if (!values.global) {
    values.global = {}
  }
  if (!values.global.kontinuous) {
    values.global.kontinuous = {}
  }

  valuesEnableStandaloneCharts(values, config)
  valuesOverride(values, config, logger)

  const chartsAliasMap = new Map()
  const context = createContext({ type: "values-compilers", chartsAliasMap })

  const valuesJsFile = `${buildProjectPath}/values.js`
  if (await fs.pathExists(valuesJsFile)) {
    values = await require(valuesJsFile)(values, {}, context)
  }

  values = await require(`${buildProjectPath}/values-compilers`)(
    values,
    {},
    context
  )

  const valuesFinalJsFile = `${buildProjectPath}/values.final.js`
  if (await fs.pathExists(valuesFinalJsFile)) {
    values = await require(valuesFinalJsFile)(values, {}, context)
  }

  await writeChartsAlias(chartsAliasMap, config)
  removeNotEnabledValues(values)
  cleanMetaValues(values)

  const projectValuesFile = await getYamlPath(`${buildProjectPath}/values`)
  if (projectValuesFile) {
    await fs.unlink(projectValuesFile)
  }

  return values
}

const copyFilesDir = async (config) => {
  const { workspaceKsPath, buildPath } = config
  const filesDir = `${workspaceKsPath}/files`
  if (!(await fs.pathExists(filesDir))) {
    return
  }
  await fs.copy(filesDir, `${buildPath}/files`, {
    dereference: true,
    filter: copyFilter,
  })
  await recurseDependency({
    config,
    afterChildren: async ({ target }) => {
      const chartsDir = `${target}/charts`
      if (!fs.pathExists(chartsDir)) {
        return
      }
      const chartDirs = await fs.readdir(chartsDir)
      for (const chartDir of chartDirs) {
        const chartDirPath = `${chartsDir}/${chartDir}`
        if (!(await fs.stat(chartDirPath)).isDirectory) {
          continue
        }
        const filesPath = `${chartDirPath}/files`
        if (!(await fs.pathExists(filesPath))) {
          fs.symlink(filesDir, filesPath)
        }
        const filesPathKontinuous = `${chartDirPath}/kontinuous-files`
        fs.symlink(filesDir, filesPathKontinuous)
      }
    },
  })
}

module.exports = async (config, logger) => {
  const { buildPath } = config

  await downloadAndBuildDependencies(config, logger)
  await installPackages(config)
  if (!config.ignoreProjectTemplates) {
    await mergeEnvTemplates(`${buildPath}/charts/project`, config)
  }
  if (config.ignoreProjectTemplates) {
    await fs.remove(`${buildPath}/charts/project/templates`)
  }
  await copyFilesDir(config)
  const values = await compileValues(config, logger)

  const valuesDump = yaml.dump(values)

  await Promise.all([
    buildChartFile(buildPath, "kontinuous-umbrella"),
    fs.writeFile(`${buildPath}/values.yaml`, valuesDump),
  ])

  await fs.writeFile(
    `${buildPath}/.helmignore`,
    ["node_modules", ".yarn"].join("\n")
  )

  return { values, valuesDump }
}
