const os = require("os")
const loadEnvConfigFiles = require("~common/utils/load-env-config-files")

module.exports = async (cwd = process.cwd()) => {
  const homedir = os.homedir()
  await loadEnvConfigFiles({
    filePrefix: ".kw",
    envPrefix: "KW_",
    dirs: [cwd, homedir],
  })
}
