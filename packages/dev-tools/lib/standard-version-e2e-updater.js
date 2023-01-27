const { execSync } = require("child_process")

const packageDef = require("../package.json")

const versionE2eConfig = require("./version-e2e-config")

module.exports = {
  readVersion: (_contents) => packageDef.version,
  writeVersion: (contents, version) => {
    for (const replacer of versionE2eConfig.replacers) {
      contents = execSync(
        `yarn \
            workspace \
            ${packageDef.name} \
            run \
            replace \
            '${replacer.regex}' \
            '${replacer.replacementFactory(`v${version}`)}' \
            -z
      `,
        { encoding: "utf-8", input: contents }
      )
    }
    return contents
  },
}
