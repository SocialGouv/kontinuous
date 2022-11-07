const replace = require("replace")

const versionE2eConfig = require("./version-e2e-config")

module.exports = () => {
  const files = new Set()
  for (const replacer of versionE2eConfig.replacers) {
    const results = replace({
      ...versionE2eConfig.common,
      regex: replacer.regex,
      preview: true,
    })
    results.forEach((result) => files.add(result.path))
  }

  return [...files]
}
