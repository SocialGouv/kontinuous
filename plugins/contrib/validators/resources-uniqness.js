module.exports = (manifests, _options, { utils }) => {
  const { KontinuousPluginError } = utils
  const uniqNames = new Set()
  for (const manifest of manifests) {
    const { kind, apiVersion } = manifest
    if (apiVersion?.startsWith("kapp.k14s.io")) {
      continue
    }

    if (manifest.metadata?.name) {
      const { metadata } = manifest
      const { namespace = "default" } = metadata
      const n = `${kind}.${namespace}.${metadata.name}`
      const nsLabel = kind === "Namespace" ? "" : `in namespace "${namespace}"`
      if (uniqNames.has(n)) {
        throw new KontinuousPluginError(
          `Duplicate ressource for kind "${kind}" with name "${metadata.name}" ${nsLabel}`
        )
      }
      uniqNames.add(n)
    }
  }
}
