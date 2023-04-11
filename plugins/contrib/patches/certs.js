module.exports = (manifests, options) => {

  const {
    annotationEnableKey = "kontinuous/use-cert-manager",
    defaultEnabled = true,
    detectWildcard = true,
    internalHosts = [],
    detectInternal = internalHosts.length > 0,
    secretName = "wildcard-crt",
    clusterIssuer = "letsencrypt-prod",
    namespaceLabels = {
      cert: "wildcard",
    },
  } = options

  const hasWildcard = (host) => host.endsWith(options.wildcardHost)
  const isInternalHost = (host) =>
    internalHosts.some((internalHost) => host.endsWith(internalHost))

  const wildcardNamespaces = new Set()

  for (const manifest of manifests) {
    const tls = manifest.spec?.tls || []
    for (const tlsEntry of tls) {
      const { hosts } = tlsEntry
      if (hosts.some(hasWildcard)) {
        const namespace = manifest.metadata?.namespace
        if (namespace) {
          wildcardNamespaces.add(namespace)
        }
        tlsEntry.secretName = secretName
      }

      let enabled = defaultEnabled

      const annotationEnableValue =
        manifest.metadata?.annotations?.[annotationEnableKey]
      if (
        annotationEnableValue !== undefined &&
        annotationEnableValue !== null &&
        annotationEnableValue !== ""
      ) {
        enabled = annotationEnableValue !== "false"
      } else if (detectWildcard && hosts.some(hasWildcard)) {
        enabled = false
      } else if (detectInternal && !hosts.every(isInternalHost)) {
        enabled = false
      }

      if (!enabled) {
        continue
      }

      if (!manifest.metadata) {
        manifest.metadata = {}
      }
      if (!manifest.metadata.annotations) {
        manifest.metadata.annotations = {}
      }
      Object.assign(manifest.metadata.annotations, {
        "cert-manager.io": "cluster-issuer",
        "cert-manager.io/cluster-issuer": clusterIssuer,
        "kubernetes.io/tls-acme": "true",
      })
    }
  }

  for (const wildcardNamespace of wildcardNamespaces) {
    const ns = manifests.find(
      (manifest) =>
        manifest.kind === "Namespace" &&
        manifest.metadata.name === wildcardNamespace
    )
    if (!ns) {
      continue
    }
    if (!ns.metadata) {
      ns.metadata = {}
    }
    if (!ns.metadata.labels) {
      ns.metadata.labels = {}
    }
    Object.assign(ns.metadata.labels, namespaceLabels)
  }

  return manifests
}
