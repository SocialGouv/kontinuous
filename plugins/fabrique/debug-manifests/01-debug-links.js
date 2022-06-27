// eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
const getManifestsSummaryImport = import(
  // eslint-disable-next-line import/extensions
  "@socialgouv/parse-manifests/src/getManifestsSummary.js"
)
// eslint-disable-next-line import/no-unresolved, import/no-extraneous-dependencies
const summaryToTextImport = import(
  // eslint-disable-next-line import/extensions
  "@socialgouv/parse-manifests/src/summaryToText.js"
)

module.exports = async (manifests, _options, { logger }) => {
  const getManifestsSummary = (await getManifestsSummaryImport).default
  const summaryToText = (await summaryToTextImport).default

  try {
    const infos = getManifestsSummary(manifests)
    const result = summaryToText(infos)
    logger.debug(`\n${result}`)
  } catch (error) {
    logger.warn({ error }, `unable to run parse-manifests`)
  }
}
