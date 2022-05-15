const os = require('os')
const path = require("path")
const fs = require("fs-extra")
const degit = require("tiged")
const yaml = require("~common/utils/yaml")
const asyncShell = require("~common/utils/async-shell")
const deepmerge = require("~common/utils/deepmerge")
const createChart = require("~common/utils/create-chart")
const loadYamlFile = require("~common/utils/load-yaml-file")
const get = require("lodash.get")
const set = require("lodash.set")
const {default: axios} = require('axios')
const decompress = require('decompress')
const downloadFile = require("~common/utils/download-file")
const slug = require("~common/utils/slug")

const dependenciesDirName = "dependencies"

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
    chart.dependencies.push({
      name: subchart.name,
      version: subchart.version,
      condition: `${subchart.name}.enabled`,
      repository: `file://./${chartsDirName}/${chartDir}`
    })
  }
}

const buildChartFile = async (target, name)=>{
  const chartFile = `${target}/Chart.yaml`
  let chart
  if(await fs.pathExists(chartFile)){
    chart = yaml.load(await fs.readFile(chartFile))
    chart.name = name
  } else {
    chart = createChart(name)
    await registerSubcharts(chart, "charts", target)
    await registerSubcharts(chart, dependenciesDirName, target)

  }
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
    dependency.repository = `file://./charts/${dependency.name}`
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
    const indexFile = `../${dependenciesDirName}/${name}/${type}`
    processors.push([indexFile,{}])
  }

  let loads = definition[type]
  if(!loads){
    const typeDir = `${target}/${type}`
    if(await fs.pathExists(typeDir)){
      const paths = await fs.readdir(typeDir)
      loads = {}
      for(const p of paths){
        let key
        if((await fs.stat(`${typeDir}/${p}`)).isDirectory()){
          key = p
        } else {
          key = p.substring(0, p.lastIndexOf('.'))
        }
        loads[key] = {require: `./${p}`, options: {}}
      }
    } else {
      loads = {}
    }
  }
  for(const [name, load] of Object.entries(loads)){
    let {require: req} = load
    if(!req){
      req = `./${name}`
    }
    const {options={}} = load
    processors.push([req, options])
  }

  const jsSrc = `const processors = [${processors.map(p=>JSON.stringify(p)).join(",")}]
module.exports = async (data, ...params)=>{
  for(const [inc, options] of processors){
    data = await require(inc)(data, ...params, options)
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
    acc.push(dependenciesDirName, item)
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

      // import dependency
      const { import: importTarget } = definition
      if(importTarget){
        if(links[importTarget]){
          await fs.ensureDir(target)
          await fs.copy(links[importTarget],target)
      
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
  for (const [key,val] of Object.entries(values)) {
    if (typeof val !== "object" || val === null) {
      continue
    }
    if (val._isChartValues && !val.enabled) {
      delete values[key]
    } else {
      removeNotEnabledValues(values[key], key, values)
    }
  }
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

const mergeEnvTemplates = async (config) => {
  const {buildPath, environment} = config
  const buildProjectPath = `${buildPath}/${dependenciesDirName}/project`
  const envTemplatesPath = `${buildProjectPath}/env/${environment}/templates`
  await fs.copy(envTemplatesPath, `${buildProjectPath}/templates`, {dereference: true})
}

const writeChartsAlias = async (chartsAliasMap, config)=>{
  const {buildPath} = config
  for(const [scope, aliasMap] of chartsAliasMap.entries()){
    const p = []
    for(const s of scope){
      p.push(dependenciesDirName)
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
      let aliasOf = val._aliasOf
      if(aliasOf.startsWith(".")){
        aliasOf = `${scope.join(".")}${dotKey}`
      }
      const scope = aliasOf.split(".")
      
      const adjacentChartAlias = scope.pop()
      if(adjacentChartAlias!==key){
        let aliasMap = chartsAliasMap.get(scope)
        if(!aliasMap){
          aliasMap = {}
          chartsAliasMap.set(scope, aliasMap)
        }
        aliasMap[key] = adjacentChartAlias
      }

      const dotKey = [...scope, key].join(".")
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
  if (!(config.chart && config.chart.length > 0)) {
    return
  }
  const enableCharts = config.chart
  for (const val of Object.values(values)) {
    val.enabled = false
  }
  for (const key of enableCharts) {
    if(!values[key]){
      values[key] = {}
    }
    values[key].enabled = true
  }
}
const valuesOverride = (values, config)=>{
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

const compileValues = async (config) => {
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
        
        if(definition.values){
          deepmerge(subValues, definition.values)
        }

      }

    }
  })

  const buildProjectPath = `${buildPath}/${dependenciesDirName}/project`
  await mergeYamlFileValues(`${buildProjectPath}/values`, values, beforeMergeProjectValues)
  await mergeYamlFileValues(`${buildProjectPath}/env/${environment}/values`, values, beforeMergeProjectValues)

  valuesEnableStandaloneCharts(values, config)
  valuesOverride(values, config)

  values = await require(`${buildProjectPath}/values-compilers`)(values, config)

  const valuesJsFile = `${buildProjectPath}/values.js`
  if(await fs.pathExists(valuesJsFile)){
    values = await require(valuesJsFile)(values)
  }
  const chartsAliasMap = resolveAliasOf(values)
  await writeChartsAlias(chartsAliasMap, config)
  removeNotEnabledValues(values)
  cleanMetaValues(values)

  return values
}

const copyFilesDir = async (config) => {
  const {workspaceSubPath, buildPath} = config
  const filesDir = `${workspaceSubPath}/files`
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
        if(!fs.pathExists(filesPath)){
          fs.symlink(filesDir ,filesPath)
        }
        const filesPathKontinuous = `${chartDirPath}/kontinuous-files`
        fs.symlink(filesDir ,filesPathKontinuous)
      }
    }
  })
}

module.exports = async (config)=>{
  await downloadAndBuildDependencies(config)
  await installPackages(config)
  await mergeEnvTemplates(config)
  await copyFilesDir(config)
  const values = await compileValues(config)
  
  const {buildPath} = config
  await Promise.all([
    buildChartFile(buildPath, "kontinuous-umbrella"),
    fs.writeFile(`${buildPath}/values.yaml`, yaml.dump(values)),
  ])

  return { values } 
}