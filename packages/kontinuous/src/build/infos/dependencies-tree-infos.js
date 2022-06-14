// const fs = require("fs-extra")
const remarkUml = require('remark-uml');
const camelcase = require("lodash.camelcase")
const ctx = require("~/ctx")

const javaExists = require("~common/utils/java-exists")

const remarkImport = import('remark');

const changeGroupPrefix = "kapp.k14s.io/change-group"
const changeRulePrefix = "kapp.k14s.io/change-rule"
const changeRuleValuePrefix = "upsert after upserting kontinuous/"

module.exports = async(manifests)=>{
  const logger = ctx.require("logger")

  if(!await javaExists()){
    logger.debug("unable to display dependencies diagram, java not available, skipping")
    return
  }

  // const config = ctx.require("config")
  
  const flatDependencies = {}
  
  for (const manifest of manifests) {
    const annotations = manifest.metadata?.annotations
    if (!annotations || !annotations[changeGroupPrefix]) {
      continue
    }
    
    let depKey = Object.keys(annotations)
      .find(key => key.startsWith(`${changeGroupPrefix}.`))
    if(!depKey){
      continue
    }
    depKey = depKey.split(".").pop()


    for (const [key, value] of Object.entries(annotations)) {
      if (
        (key === changeRulePrefix ||
        key.startsWith(`${changeRulePrefix}.`))
        && value.startsWith(changeRuleValuePrefix)
      ) {
        if(!flatDependencies[depKey]){
          flatDependencies[depKey] = new Set()
        }
        let dep = value.slice(changeRuleValuePrefix.length)
        dep = dep.split(".").shift()
        dep = camelcase(dep)
        flatDependencies[depKey].add(dep)
      }
    }
  }


  const uml = []
  for(const [key, dependenciesSet] of Object.entries(flatDependencies)){
    for(const dep of dependenciesSet){
      if(dep!==key){
        uml.push(`${dep} -> ${key}`)
      }
    }
  }

  if(uml.length===0){
    return
  }
  
  const content = "@startuml\n"+uml.join("\n")+"\n@enduml"

  const {remark} = await remarkImport
  let result = await remark()
    .use(remarkUml, { format: 'txt' })
    .process(content)

  result = result.toString()
  result = result.slice(6, result.length-4)
  
  logger.debug("\n"+result)
  
  // await fs.writeFile(`${config.buildPath}/dependencies.tree.md`, `uml\`\`\`\n${result}\n\`\`\``)


}