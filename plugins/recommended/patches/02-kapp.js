const kappStrategyAnnotations = {
  // "kapp.k14s.io/disable-default-ownership-label-rules": "",
  // "kapp.k14s.io/disable-default-label-scoping-rules": "",
  "kapp.k14s.io/create-strategy": "fallback-on-update",
  "kapp.k14s.io/update-strategy": "fallback-on-replace",
}

const kappAnnotationsPod = {
  "kapp.k14s.io/nonce": "",
}

const kindPatches = {
  Deployment: (manifest) => {
    Object.assign(
      manifest.metadata.annotations,
      kappStrategyAnnotations,
      kappAnnotationsPod
    )
  },
  Job: (manifest) => {
    Object.assign(
      manifest.metadata.annotations,
      kappStrategyAnnotations,
      kappAnnotationsPod
    )
  },
  CronJob: (manifest) => {
    Object.assign(
      manifest.metadata.annotations,
      kappStrategyAnnotations,
      kappAnnotationsPod
    )
  },
}

module.exports = (manifests) => {
  for (const manifest of manifests) {
    if (!manifest.metadata) {
      manifest.metadata = {}
    }
    if (!manifest.metadata.annotations) {
      manifest.metadata.annotations = {}
    }
    if (manifest.kind !== "Namespace") {
      manifest.metadata.annotations["kapp.k14s.io/disable-original"] = ""
    }
    if (kindPatches[manifest.kind]) {
      kindPatches[manifest.kind](manifest)
    }
  }
  return manifests
}
