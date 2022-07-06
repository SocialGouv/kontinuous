const hasWildcard = (host) => host.endsWith(".dev.fabrique.social.gouv.fr")

module.exports = (manifests, _options, { config }) => {
  const { environment } = config

  const isProd = environment === "prod"

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
        tlsEntry.secretName = "wildcard-crt"
      }
      if (!hosts.every(hasWildcard)) {
        if (!manifest.metadata) {
          manifest.metadata = {}
        }
        if (!manifest.metadata.annotations) {
          manifest.metadata.annotations = {}
        }
        const clusterIssuer = isProd
          ? "letsencrypt-prod"
          : "letsencrypt-staging"
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
    Object.assign(ns.metadata.labels, {
      cert: "wildcard",
    })
  }

  return manifests
}
