require('~/ts-node');

const path = require("path")

function requireTs(filePath) {  
  const result = require(filePath);
  return result.default || result;
}

module.exports = (type, context)=>{
  const { config, getOptions, getScope } = context
  
  return (inc, parentScope=["project"])=>{
    
    const scope = getScope({scope: parentScope, inc, type})
    const pluginOptions = getOptions({
      scope,
      inc,
      type,
      config,
    })
    const rPath = path.join(
      config.buildPath,
      ...parentScope.map(s=>`charts/${s}`),
      type,
      inc
    )

    
    return async (data)=>{
      const ext = path.extname(inc)

      let requireFunc
      if(ext===".ts"){
        requireFunc = requireTs
      }else{
        requireFunc = (r)=>require(r)
      }

      const plugin = requireFunc(rPath)
    
      const result = await plugin(
        data,
        pluginOptions,
        context,
        scope
      )

      if(result){
        data = result
      }
      
      return data
    }

  }
}
