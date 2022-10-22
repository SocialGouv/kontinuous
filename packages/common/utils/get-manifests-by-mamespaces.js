module.exports = (manifests) => {
  const o = {}
  for (const manifest of manifests) {
    const ns = manifest.metadata?.namespace
    if (!o[ns]) {
      o[ns] = []
    }
    o[ns].push(manifest)
  }
  return o
}
