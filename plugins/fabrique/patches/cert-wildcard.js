module.exports = (manifests, _options, {config}) => {
  const {environment} = config
  
  if(environment==="prod"){
    return manifests
  }
  
  const mainNamespace = manifests.find((manifest)=>manifest.kind==="Namespace" && manifest.metadata?.annotations?.["kontinuous/mainNamespace"]==='true')
  if(mainNamespace){
    if(!mainNamespace.metadata){
      mainNamespace.metadata = {}
    }
    if(!mainNamespace.metadata.labels){
      mainNamespace.metadata.labels = {}
    }
    Object.assign(mainNamespace.metadata.labels, {
      "cert": "wildcard",
    })
  }

  return manifests
}
