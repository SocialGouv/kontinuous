const fs = require("fs-extra")

module.exports = async (config) => {
  const { project } = config
  const { secrets, paths } = project
  const { supertoken } = secrets

  const { reloadableSecretsRootPath, tokensSecretDir } = paths
  const tokens = { ...secrets.tokensFromConfig }

  const tokensSecretPath = `${reloadableSecretsRootPath}/${tokensSecretDir}`

  const files = await fs.readdir(tokensSecretPath)
  Object.assign(
    tokens,
    await files.reduce(async (o, filename) => {
      const content = await fs.readFile(`${tokensSecretPath}/${filename}`, {
        encoding: "utf-8",
      })
      return {
        ...(await o),
        [filename]: content.split("\n").filter((token) => token !== ""),
      }
    }, {})
  )

  // console.log(tokens)

  project.secrets.tokens = tokens
  project.httpLogger = {
    hideSecrets: [
      ...Object.values(tokens).flatMap((values) => values),
      ...(supertoken ? [supertoken] : []),
    ],
  }
}
