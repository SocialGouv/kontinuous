const replace = require("replace")

const versionE2eConfig = require("./version-e2e-config")

module.exports = async () => {
  const files = new Set()
  for (const target of versionE2eConfig.targets) {
    const results = replace({
      ...versionE2eConfig.common,
      regex: target.regex,
      preview: true,
    })
    results.forEach((result) => files.add(result.path))
  }

  return [...files]
}
