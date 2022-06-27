/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved, import/extensions */

const getManifestsSummaryImport = import(
  "@socialgouv/parse-manifests/src/getManifestsSummary.js"
)
const summaryToTextImport = import(
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
