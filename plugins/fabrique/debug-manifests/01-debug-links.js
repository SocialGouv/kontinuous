// eslint-disable-next-line import/extensions, import/no-unresolved, import/no-extraneous-dependencies
const toTextImport = import("@socialgouv/parse-manifests/src/toText.js")

module.exports = async (manifests, _options, { logger, utils }) => {
  const toText = (await toTextImport).default

  const { yaml } = utils
  const manifestsDump = manifests
    .map((manifest) => yaml.dump(manifest))
    .join("---\n")
  try {
    const result = toText(manifestsDump)
    logger.debug(`\n${result}`)
  } catch (error) {
    logger.warn({ error }, `unable to run parse-manifests`)
  }
}
