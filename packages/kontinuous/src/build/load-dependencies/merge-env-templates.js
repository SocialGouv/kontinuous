const fs = require("fs-extra")
const copyFilter = require("~common/config/copy-filter")

module.exports = async (rootPath, config) => {
  const { environment } = config
  const envTemplatesPath = `${rootPath}/env/${environment}/templates`
  if (await fs.pathExists(envTemplatesPath)) {
    await fs.copy(envTemplatesPath, `${rootPath}/templates`, {
      dereference: true,
      filter: copyFilter,
    })
  }
}
