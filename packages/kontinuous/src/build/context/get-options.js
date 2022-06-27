const path = require('path')

const camelCase = require('lodash.camelcase')
const get = require("lodash.get")

module.exports = ({scope, inc, type, config})=>{
  const rootDir = `../charts/`
  
  let dotInc 
  
  const ext = path.extname(inc)
  if(ext){
    inc = inc.slice(0,inc.length-ext.length)
  }
  
  if(/^[0-9]*\-/.test(inc)){
    inc = inc.slice(inc.indexOf("-")+1)
  }
  
  scope = scope.slice(1)
  if (inc.startsWith("./")){
    inc = inc.slice(2)
    dotInc =  [...scope, type, inc]
  } else if(inc.startsWith(rootDir)){
    inc = inc.slice(rootDir.length)
    dotInc =  [...scope, inc]
  }

  dotInc = dotInc.flatMap(k => k.
    replaceAll("/",".")
    .split(".")
    .map( k2 => camelCase(k2) )
  ).join(".")

  return get(config.dependencies, `${dotInc}.options`) || {}
}