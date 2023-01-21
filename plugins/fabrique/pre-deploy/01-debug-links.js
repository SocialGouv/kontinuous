/* eslint-disable import/no-extraneous-dependencies, import/no-unresolved, import/extensions */

const getManifestsSummaryImport = import(
  "@socialgouv/parse-manifests/src/getManifestsSummary.js"
)
const summaryToTextImport = import(
  "@socialgouv/parse-manifests/src/summaryToText.js"
)

module.exports = async (manifests, _options, { logger, utils }) => {
  const getManifestsSummary = (await getManifestsSummaryImport).default
  const summaryToText = (await summaryToTextImport).default

  const infos = getManifestsSummary(manifests)
  const result = summaryToText(infos)

  logger.debug("🐞 debug links:")

  const log = logger.child({}, { indentation: 2 })
  log.setFields({})

  result.split("\n").forEach((line) => {
    if (!line.trim()) {
      return
    }
    line = utils.removePrefix(line, "#### ")
    line = utils.removePrefix(line, "### ")
    log.debug(line)
  })
}
