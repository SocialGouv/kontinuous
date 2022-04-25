const MAX_DNS_LENGTH = 63
module.exports = (manifests) => {
  for (const manifest of manifests) {
    if (manifest.kind !== "Ingress") {
      continue
    }
    const rules = manifest.spec?.rules || []
    for (const { host } of rules) {
      const domainParts = host.split(".")
      for (const subdomain of domainParts) {
        if (subdomain.length > MAX_DNS_LENGTH) {
          throw new Error(
            `subdomain dns max length reached ${subdomain.length}/${MAX_DNS_LENGTH} for subdomain ${subdomain} in host ${host}`
          )
        }
      }
    }
  }
}
