const path = require("path")
const fs = require("fs-extra")

function splitPath(p) {
  const parts = p.split(/(\/|\\)/)
  if (!parts.length) return parts
  return !parts[0].length ? parts.slice(1) : parts
}

module.exports = async (currentFullPath, clue) => {
  const testDir = async (parts) => {
    if (parts.length === 0) {
      return null
    }
    const p = parts.join("")
    if (await fs.pathExists(path.join(p, clue))) {
      return p
    }
    return testDir(parts.slice(0, -1))
  }

  return testDir(splitPath(currentFullPath))
}
