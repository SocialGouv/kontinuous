module.exports = (manifests, _options, {config}) => {
  const {environment} = config
  if(environment!=="prod"){
    return manifests
  }
  for(const manifest of manifests){
    const {kind} = manifest
    if(kind!=="Ingress"){
      continue
    }
    if(!manifest.metadata){
      manifest.metadata = {}
    }
    if(!manifest.metadata.annotations){
      manifest.metadata.annotations = {}
    }
    Object.assign(manifest.metadata.annotations, {
      "cert-manager.io": "cluster-issuer",
      "cert-manager.io/cluster-issuer": "letsencrypt-prod",
      "kubernetes.io/tls-acme": 'true'
    })
  }
  return manifests
}
