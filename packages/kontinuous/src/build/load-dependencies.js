const os = require('os')
const path = require("path")
const fs = require("fs-extra")
const degit = require("tiged")
const camelCase = require('lodash.camelcase')
const get = require("lodash.get")
const set = require("lodash.set")
const {default: axios} = require('axios')
const decompress = require('decompress')

const yaml = require("~common/utils/yaml")
const asyncShell = require("~common/utils/async-shell")
const deepmerge = require("~common/utils/deepmerge")
const createChart = require("~common/utils/create-chart")
const loadYamlFile = require("~common/utils/load-yaml-file")
const downloadFile = require("~common/utils/download-file")
const getYamlPath = require("~common/utils/get-yaml-path")

const slug = require("~common/utils/slug")

const createContext = require("./context")

const validateName = /^[a-zA-Z\d-_]+$/

const registerSubcharts = async (chart, chartsDirName, target)=>{
  const chartsDir = `${target}/${chartsDirName}`
  if(!await fs.pathExists(chartsDir)){
    return
  }
  const chartDirs = await fs.readdir(chartsDir)
  for(const chartDir of chartDirs){
    const chartDirPath = `${chartsDir}/${chartDir}`
    if(!(await fs.stat(chartDirPath)).isDirectory()){
      continue
    }
    const subchartFile = `${chartDirPath}/Chart.yaml`
    if(!await fs.pathExists(subchartFile)){
      await buildChartFile(chartDirPath, chartDir)
    }
    const subchartContent = await fs.readFile(subchartFile)
    const subchart = yaml.load(subchartContent)
    const dependency = {
      name: subchart.name,
      version: subchart.version,
      repository: `file://./${chartsDirName}/${chartDir}`,
    }
    const definedDependency = chart.dependencies.find((dependency)=>
      ((dependency.alias||dependency.name)===subchart.name)
    )
    if(definedDependency){
      Object.assign(definedDependency, dependency)
    }
    if(subchart.type!=="library"&&!dependency.condition){
      dependency.condition = `${dependency.alias || dependency.name}.enabled`
    }
    chart.dependencies.push(dependency)
  }
}

const buildChartFile = async (target, name)=>{
  const chartFile = `${target}/Chart.yaml`
  const chart = createChart(name)
  if(await fs.pathExists(chartFile)){
    const extendChart = yaml.load(await fs.readFile(chartFile))
    Object.assign(chart, extendChart)
    chart.name = name
    for(const dep of chart.dependencies){
      if(dep.condition){
        continue
      }
      dep.condition = `${dep.alias || dep.name}.enabled`
    }
  }
  await registerSubcharts(chart, "charts", target)
  await fs.ensureDir(target)
  await fs.writeFile(chartFile, yaml.dump(chart))
}

const downloadRemoteRepository = async (target, name)=>{
  const chartFile = `${target}/Chart.yaml`
  const chart = yaml.load(await fs.readFile(chartFile))
  const {dependencies=[]} = chart
  let touched = false
  for(const dependency of dependencies){
    const {repository} = dependency
    if(repository.startsWith("file://")){
      continue
    }
    const localArchive = `${target}/charts/${dependency.name}-${dependency.version}.tgz`
    let zfile
    if(await fs.pathExists(localArchive)){
      zfile = localArchive
    } else {
      const homeOrTmpDir = os.homedir || os.tmpdir
      const cacheDir = `${homeOrTmpDir}/.kontinuous/cache/charts`
      const archiveSlug = slug([dependency.name, dependency.version, repository])
      zfile = `${cacheDir}/${archiveSlug}.tgz`
      if(!await fs.pathExists(zfile)){
        await fs.ensureDir(cacheDir)
        const chartRepository = `${repository}/index.yaml`
        let repositoryIndex
        try {
          repositoryIndex = await axios.get(chartRepository)
        }
        catch(e){
          throw Error(`Unable to download ${chartRepository}: ${e.message}`)
        }
        const repo = yaml.load(repositoryIndex.data)
        const {entries} = repo
        const entryVersions = entries[dependency.name]
        const version = entryVersions.find(entry=>{
          return entry.version.toString() === dependency.version.toString()
        })
        if(!version){
          throw new Exception(`version ${dependency.version} not found for ${dependency.name}`)
        }
        const url = version.urls[0]
        await downloadFile(url, zfile)
      }
    }

    await decompress(zfile, `${target}/charts`)
    
    let chartName = dependency.name
    if(dependency.alias){
      chartName = dependency.alias
      await fs.rename(`${target}/charts/${dependency.name}`, `${target}/charts/${dependency.alias}`)
    }

    dependency.repository = `file://./charts/${chartName}`
    touched = true
  }
  if(touched){
    await fs.writeFile(chartFile, yaml.dump(chart))
  }
}

const buildJsFile = async (target, type, definition)=>{
  const jsFile = `${target}/${type}/index.js`
  if(await fs.pathExists(jsFile)){
    return
  }
  const processors = []
  
  const {dependencies={}} = definition
  for(const name of Object.keys(dependencies)){
    const indexFile = `../charts/${name}/${type}`
    processors.push(indexFile)
  }

  const typeKey = camelCase(type)
  let loads = definition[typeKey] || {}
  const typeDir = `${target}/${type}`

  const exts = [".js",".ts"]
  if(await fs.pathExists(typeDir)){
    const paths = await fs.readdir(typeDir)
    for(const p of paths){
      let key
      if((await fs.stat(`${typeDir}/${p}`)).isDirectory()){
        if(!await fs.pathExists(`${typeDir}/${p}/index.js`)){
          continue
        }
        key = p
      } else {
        const ext = path.extname(p)
        if(!exts.includes(ext)){
          continue
        }
        key = p.substring(0, p.length-ext.length)
      }
      key = camelCase(key)
      if(!loads[key]){
        loads[key] = {}
      }
      loads[key].require = `./${p}`
    }
  }

  for(const [name, load] of Object.entries(loads)){
    let {require: req} = load
    if(!req){
      req = `./${name}`
    }
    processors.push(req)
  }

  const jsSrc = `const processors = [${processors.map(p=>JSON.stringify(p)).join(",")}]
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

const recurseDependency = async (param={})=>{
  const {
    name = "project",
    config,
    definition = config,
    beforeChildren = ()=>{},
    afterChildren = ()=>{},
  } = param

  const {buildPath} = config

  if(!validateName.test(name)){
    throw new Exception(`invalid import name format, expected only alphanumerics hyphens and underscores characters, received: "${name}"`)
  }

  const scope = [...(param.scope || []), name]
  const subpath = path.join(...scope.reduce((acc, item)=>{
    acc.push("charts", item)
    return acc
  },[]))
  const target = `${buildPath}/${subpath}`
  
  const callbackParam = {
    name,
    definition,
    scope,
    config,
    target
  }

  await beforeChildren(callbackParam)
  
  const {dependencies} = definition
  if(dependencies){
    await Promise.all(Object.entries(dependencies).map(([name, definition])=>
      recurseDependency({
        ...param,
        name,
        definition,
        scope
      })
    ))
  }
  
  await afterChildren(callbackParam)
}

const downloadAndBuildDependencies = async (config)=>{
  await recurseDependency({
    config,
    beforeChildren: async ({
      target,
      definition,
      config,
    })=>{
      const {links={}} = config
      
      const { import: importTarget } = definition
      
      if(importTarget){
        const matchLink = Object.entries(links).find(([key]) =>
          importTarget.startsWith(key)
        )
        if(matchLink){
          const [linkKey, linkPath] = matchLink
          const from = linkPath + importTarget.substr(linkKey.length)
          await fs.ensureDir(target)
          await fs.copy(from,target)
        }else{
          await degit(importTarget).clone(target)
        }
      }
      
      // load config file
      const pluginConfigFile = `${target}/kontinuous.yaml`
      if((await fs.pathExists(pluginConfigFile))){
        const pluginConfig = yaml.load(await fs.readFile(pluginConfigFile))
        Object.assign(definition, deepmerge({}, pluginConfig, definition))
      }
    },
    afterChildren: async ({
      name,
      target,
      definition,
    })=>{
      await buildChartFile(target, name)
      await downloadRemoteRepository(target, name)
      await buildJsFile(target, "values-compilers", definition)
      await buildJsFile(target, "patches", definition)
      await buildJsFile(target, "validators", definition)
    }
  })
}

const installPackages = async (config) => {
  await recurseDependency({
    config,
    afterChildren: async ({
      target,
    })=>{
      if (
        await fs.pathExists(`${target}/package.json`) &&
        !await fs.pathExists(`${target}/node_modules`) &&
        !await fs.pathExists(`${target}/.pnp.cjs`)
      ) {
        await asyncShell("yarn", { cwd: target }, (proc) => {
          proc.stdout.pipe(process.stderr)
          proc.stderr.pipe(process.stderr)
        })
      }

    }
  })
}

const beforeMergeChartValues = (values)=>{
  values._isChartValues = true
  return values
}

const beforeMergeProjectValues = (values)=>{
  values = beforeMergeChartValues(values)
  for(const [key, subValues] of Object.entries(values)){
    if(key==="global"){
      continue
    }
    if(typeof subValues !== "object" || subValues===null){
      continue
    }
    subValues._isProjectValues = true
  }
  return values
}

const cleanMetaValues = (values)=>{
  if(typeof values !== 'object' || values === null){
    return
  }
  for(const key of Object.keys(values)){
    if(key.startsWith("_")){
      delete values[key]
    }
    else{
      cleanMetaValues(values[key])
    }
  }
}

const removeNotEnabledValues = (values) => {
  let hasEnabledValue
  for (const [key,val] of Object.entries(values)) {
    if (typeof val !== "object" || val === null) {
      continue
    }
    const childrenHasEnabledValue = removeNotEnabledValues(values[key])
    if (childrenHasEnabledValue && val.enabled !== false) {
      hasEnabledValue = true
      val.enabled = true
    }
    if(val._isChartValues && !val.enabled){
      // delete values[key]
      values[key] = {enabled: false}
    }
  }
  return hasEnabledValue || (values._isChartValues && values.enabled)
}


const mergeYamlFileValues = async (valuesFileBasename, subValues, beforeMerge)=>{
  let val = await loadYamlFile(valuesFileBasename)
  if(!val){
    return
  }
  if(beforeMerge){
    val = beforeMerge(val)
  }
  deepmerge(subValues, val)
}

const mergeEnvTemplates = async (rootPath, config) => {
  const {environment} = config
  const envTemplatesPath = `${rootPath}/env/${environment}/templates`
  if(await fs.pathExists(envTemplatesPath)){
    await fs.copy(envTemplatesPath, `${rootPath}/templates`, {dereference: true})
  }
}

const writeChartsAlias = async (chartsAliasMap, config)=>{
  const {buildPath} = config
  for(const [scope, aliasMap] of chartsAliasMap.entries()){
    const p = []
    for(const s of scope){
      p.push("charts")
      p.push(s)
    }
    const chartFile = `${buildPath}/${path.join(...p)}/Chart.yaml`
    const chartContent = await fs.readFile(chartFile)
    const chart = yaml.load(chartContent)
    for(const [alias, name] of Object.entries(aliasMap)){
      const aliasOf = chart.dependencies.find(dep=>dep.name===name)
      chart.dependencies.push({
        ...aliasOf,
        alias,
        condition: `${alias}.enabled`
      })
    }
    await fs.writeFile(chartFile, yaml.dump(chart))
  }
}

const resolveAliasOf = (values, rootValues=values, scope=[], chartsAliasMap=new Map())=>{
  for (const [key, val] of Object.entries(values)) {
    if (typeof val !== "object" || val === null) {
      continue
    }
    if(val._aliasOf){
      
      const parentDotKey = [...scope, key].join(".")

      let aliasOf = val._aliasOf
      if(aliasOf.startsWith(".")){
        aliasOf = `${scope.join(".")}${parentDotKey}`
      }

      const aliasScope = aliasOf.split(".")
      const adjacentChartAlias = aliasScope.pop()
      if(adjacentChartAlias!==key){
        let aliasMap = chartsAliasMap.get(aliasScope)
        if(!aliasMap){
          aliasMap = {}
          chartsAliasMap.set(aliasScope, aliasMap)
        }
        aliasMap[key] = adjacentChartAlias
      }
      
      const dotKey = `${aliasScope.join(".")}.${key}`

      let nestedVal = get(rootValues, dotKey)
      if (!nestedVal) {
        nestedVal = {}
        set(rootValues, dotKey, nestedVal)
      }
      deepmerge(nestedVal, val)
      delete values[key]
    } else {
      resolveAliasOf(values[key], rootValues, [...scope, key])
    }
  }

  return chartsAliasMap
}

const valuesEnableStandaloneCharts = (values, config)=>{
  const hasAll = !(config.chart && config.chart.length > 0)
  values.global.kontinuous.hasChart = !hasAll
  values.global.kontinuous.hasAll = hasAll
  if (hasAll) {
    return
  }
  values.global.kontinuous.chart = config.chart
  for (const [key,val] of Object.entries(values)) {
    if(key==="project" || key==="global"){
      continue
    }
    if (typeof values[key] !== "object" || values[key] === null) {
      continue
    }
    val.enabled = false
  }
  const enableCharts = config.chart
  for (const key of enableCharts) {
    if (typeof values[key] !== "object" || values[key] === null) {
      values[key] = {}
    }
    values[key].enabled = true
  }
}
const valuesOverride = (values, config, logger)=>{
  if(config.inlineValues) {
    const inlineValues = yaml.load(config.inlineValues)
    values = deepmerge(values, inlineValues)
  }

  const setValues = config.set
  if(setValues){
    if(Array.isArray(setValues)){
      for(const s of setValues){
        const index = s.indexOf("=");
        if(index===-1){
          logger.warn("bad format for --set option, expected: foo=bar")
          continue
        }
        const key = s.slice(0, index)
        const val = s.slice(index+1)
        set(values, `${key}`, yaml.parse(val))
      }

    } else {
      for(const [key, val] of Object.entries(setValues)){
        set(values, key, val)
      }
    }
  }
}

const compileValues = async (config, logger) => {
  let values = {}
  const {buildPath, environment} = config

  await recurseDependency({
    config,
    afterChildren: async ({
      target,
      definition,
      scope,
    }) => {
      const chartsPath = `${target}/charts`
      if(!await fs.pathExists(chartsPath)){
        return
      }

      const chartDirs = await fs.readdir(chartsPath)
      for(const chartDir of chartDirs){
        if(!(await fs.stat(`${chartsPath}/${chartDir}`)).isDirectory()){
          continue
        }
        const chartName = chartDir
        const dotKey = [...scope, chartName].join(".")
        let subValues = get(values, dotKey)
        if(!subValues){
          subValues = {}
          set(values, dotKey, subValues)
        }
        
        await mergeYamlFileValues(`${chartsPath}/${chartDir}/values`, subValues, beforeMergeChartValues)
        await mergeYamlFileValues(`${chartsPath}/${chartDir}/env/${environment}/values`, subValues, beforeMergeChartValues)
        await mergeEnvTemplates(`${chartsPath}/${chartDir}`, config)

        if(definition.values){
          deepmerge(subValues, definition.values)
        }

      }

    }
  })

  const buildProjectPath = `${buildPath}/charts/project`
  await mergeYamlFileValues(`${buildProjectPath}/values`, values, beforeMergeProjectValues)
  await mergeYamlFileValues(`${buildProjectPath}/env/${environment}/values`, values, beforeMergeProjectValues)

  if(!values.global){
    values.global = {}
  }
  if(!values.global.kontinuous){
    values.global.kontinuous = {}
  }
  
  valuesEnableStandaloneCharts(values, config)
  valuesOverride(values, config, logger)

  const context = createContext({type: "values-compilers"})
  
  const valuesJsFile = `${buildProjectPath}/values.js`
  if(await fs.pathExists(valuesJsFile)){
    values = await require(valuesJsFile)(values, {}, context)
  }

  values = await require(`${buildProjectPath}/values-compilers`)(values, {}, context)

  const valuesFinalJsFile = `${buildProjectPath}/values.final.js`
  if(await fs.pathExists(valuesFinalJsFile)){
    values = await require(valuesFinalJsFile)(values, {}, context)
  }

  const chartsAliasMap = resolveAliasOf(values)
  await writeChartsAlias(chartsAliasMap, config)
  removeNotEnabledValues(values)
  cleanMetaValues(values)

  const projectValuesFile = await getYamlPath(`${buildProjectPath}/values`)
  if(projectValuesFile){
    await fs.unlink(projectValuesFile)
  }

  return values
}

const copyFilesDir = async (config) => {
  const {workspaceKsPath, buildPath} = config
  const filesDir = `${workspaceKsPath}/files`
  if(!await fs.pathExists(filesDir)){
    return
  }
  await fs.copy(filesDir,`${buildPath}/files`,{dereference: true})
  await recurseDependency({
    config,
    afterChildren: async ({
      target,
    })=>{
      const chartsDir = `${target}/charts`
      if(!fs.pathExists(chartsDir)){
        return
      }
      const chartDirs = await fs.readdir(chartsDir)
      for(const chartDir of chartDirs){
        const chartDirPath = `${chartsDir}/${chartDir}`
        if(!(await fs.stat(chartDirPath)).isDirectory){
          continue
        }
        const filesPath = `${chartDirPath}/files`
        if(!await fs.pathExists(filesPath)){
          fs.symlink(filesDir, filesPath)
        }
        const filesPathKontinuous = `${chartDirPath}/kontinuous-files`
        fs.symlink(filesDir, filesPathKontinuous)
      }
    }
  })
}

module.exports = async (config, logger)=>{
  const {buildPath} = config

  await downloadAndBuildDependencies(config)
  await installPackages(config)
  await mergeEnvTemplates(`${buildPath}/charts/project`, config)
  await copyFilesDir(config)
  const values = await compileValues(config, logger)

  await Promise.all([
    buildChartFile(buildPath, "kontinuous-umbrella"),
    fs.writeFile(`${buildPath}/values.yaml`, yaml.dump(values)),
  ])

  await fs.writeFile(`${buildPath}/.helmignore`, ["node_modules",".yarn"].join("\n"))

  return { values } 
}