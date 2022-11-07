const { execSync } = require("child_process")

const package = require("../package.json")

const versionE2eConfig = require("./version-e2e-config")

module.exports = {
  readVersion: (_contents) => package.version,
  writeVersion: (contents, version) => {
    for (const replacer of versionE2eConfig.replacers) {
      contents = execSync(
        `yarn \
            workspace \
            ${package.name} \
            run \
            replace \
            "${replacer.regex}" \
            "${replacer.replacementFactory(version)}" \
            -z
      `,
        { encoding: "utf-8" }
      )
    }
    return contents
  },
}
