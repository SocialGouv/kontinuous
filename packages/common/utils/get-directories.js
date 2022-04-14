const fs = require("fs-extra")

module.exports = async (source) => {
  const dirs = await fs.readdirSync(source, { withFileTypes: true })
  return dirs
    .filter((dirent) => dirent.isDirectory() || dirent.isSymbolicLink())
    .map((dirent) => dirent.name)
}
