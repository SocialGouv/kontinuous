const fs = require('fs');
const { cp } = require('fs/promises');

const yaml = require('js-yaml');
const { generate } = require("@socialgouv/env-slug")
const degit = require('degit')

const miniHash = require("./utils/miniHash")

fs.mkdirSync("uses", {recursive: true})

const downloadingPromises = {}

const userCwd = process.env.WORKING_DIR || process.env.OLDPWD || process.cwd()

const requireUse = async (use) => {
  const slug = generate(use)
  use = use.replace("@", "#")
  let target = `uses/${slug}`
  if (!fs.existsSync(`${process.cwd()}/${target}`)){
    let loading = downloadingPromises[slug]
    if (!loading){
      if (use.startsWith(".") || use.startsWith("/")){
        console.log(`import local ${cp}`)
        const cpOptions = {}
        if(fs.lstatSync(cp).isDirectory()){
          cpOptions.recursive = true
        }
        loading = cp(`${userCwd}/${use}`, target, cpOptions);
      } else {
        console.log(`degit ${use}`)
        loading = degit(use).clonde(target)
      }
      downloadingPromises[slug] = loading
    }
  }
  if (fs.lstatSync(target).isDirectory()) {
    target += "/use.yaml"
  }
  return { slug, use, target }
}

const compile = async (file, parentScope = [], parentWith = {}) => {
  const values = yaml.load(fs.readFileSync(file))
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
    for(const sc of scope){
      currentScope.push(sc)
      scopes.push(currentScope.join("."))
    }
    if (scope.length > 1){
        scopes.push([scope[0], scope[scope.length - 1]].join(".."))
    }
    run.scopes = scopes
    run.parentWith = Object.assign({}, parentWith, run.with)

    if (!run.needs) {
      run.needs = []
    }
    run.needs = run.needs.map((r) => [ scope[0], r ].join("..") )

    if (!run.use){
      newRuns.push(run)
      continue
    }

    const { target } = await requireUse(run.use)
    const compiled = await compile(target, scope, run.parentWith)
    if (compiled.runs){
      const flat = compiled.runs.map(r => ({
        action: run.use,
        ...Object.entries(r).reduce((acc, [key, value]) => {
          if (key != "use") {
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

const main = async() => {
  const compiled = await compile("merged.values.yaml")
  fs.writeFileSync("compiled.values.json", JSON.stringify(compiled, null, 2))
}

main()
