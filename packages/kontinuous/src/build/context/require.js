const path = require("path")

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
      const plugin = require(rPath)
    
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
