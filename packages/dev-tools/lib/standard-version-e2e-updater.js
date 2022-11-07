const asyncShell = require("~common/utils/async-shell")

const package = require("../package.json")

const versionE2eConfig = require("./version-e2e-config")

module.exports = {
  readVersion: (_contents) => package.version,
  writeVersion: async (contents, version) => {
    for (const replacer of versionE2eConfig.replacers) {
      contents = await asyncShell([
        "yarn",
        "workspace",
        package.name,
        "run",
        "replace",
        replacer.regex,
        replacer.replacementFactory(version),
        "-z",
      ])
    }
    return contents
  },
}
