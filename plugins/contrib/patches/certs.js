module.exports = (manifests, options) => {
  const hasWildcard = (host) => host.endsWith(options.wildcardHost)
  const isInternalHost = (host) =>
    options.internalHosts.some((internalHost) => host.endsWith(internalHost))

  const {
    secretName = "wildcard-crt",
    clusterIssuer = "letsencrypt-prod",
    namespaceLabels = {
      cert: "wildcard",
    },
  } = options
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

      // apply cert-manager annotations only for internal, non-wildcard hosts
      if (!hosts.every(hasWildcard) && hosts.every(isInternalHost)) {
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
