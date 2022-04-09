const fs = require("fs-extra")

module.exports = async (...basepathList) => {
  for (const basepath of basepathList) {
    const files = [`${basepath}.yaml`, `${basepath}.yml`]
    for (const f of files) {
      if (await fs.pathExists(f)) {
        return f
      }
    }
  }
}
