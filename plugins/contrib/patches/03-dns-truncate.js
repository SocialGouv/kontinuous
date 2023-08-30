const MAX_DNS_LENGTH = 63

module.exports = (manifests, _options, context) => {
  const { utils } = context
  const { yaml, slug, logger } = utils

  let subdomainsToTruncate = []
  do {
    subdomainsToTruncate = []
    for (const manifest of manifests) {
      if (manifest.kind !== "Ingress") {
        continue
      }
      const rules = manifest.spec?.rules || []
      for (const { host } of rules) {
        const domainParts = host.split(".")
        for (const subdomain of domainParts) {
          if (subdomain.length > MAX_DNS_LENGTH) {
            subdomainsToTruncate.push(subdomain)
          }
        }
      }
    }

    if (subdomainsToTruncate.length > 0) {
      let inline = yaml.dump(manifests)
      for (const subdomain of subdomainsToTruncate) {
        const slugSubdomain = slug(subdomain)
        logger.debug(
          `replacing too long subdomain "${subdomain}" -> "${slugSubdomain}"`
        )
        inline = inline.replaceAll(subdomain, slugSubdomain)
      }
      manifests = yaml.load(inline)
    }
  } while (subdomainsToTruncate.length > 0)

  return manifests
}
