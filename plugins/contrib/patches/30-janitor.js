const { persistPatterns } = require("../lib/persist-convention")

module.exports = (manifests, options, { config, values, utils }) => {
  if (config.environment !== "dev") {
    return manifests
  }

  const {
    permanentDevEnvironmentBranches = [
      "master",
      "main",
      "dev",
      "develop",
      ...persistPatterns,
    ],
  } = options

  const { patternMatch } = utils

  if (patternMatch(config.gitBranch, permanentDevEnvironmentBranches)) {
    return
  }

  const ttl =
    (values && (values.ttl || (values.global && values.global.ttl))) || "7d"

  for (const manifest of manifests) {
    if (manifest.kind === "Namespace") {
      if (!manifest.metadata) {
        manifest.metadata = {}
      }
      if (!manifest.metadata.annotations) {
        manifest.metadata.annotations = {}
      }
      manifest.metadata.annotations["janitor/ttl"] = ttl
    }
  }

  return manifests
}
