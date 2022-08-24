const { diffStringsUnified } = require("jest-diff")

const fs = require("fs-extra")

module.exports = async (stdout, name, snapConfig) => {
  const { snapshotsDir, update } = snapConfig
  const writePath = `${snapshotsDir}/${name}`

  if (!update) {
    let existingSnap = false
    if (await fs.pathExists(writePath)) {
      existingSnap = await fs.readFile(writePath, { encoding: "utf-8" })
      if (stdout !== existingSnap) {
        const compare = diffStringsUnified(stdout, existingSnap, {
          includeChangeCounts: true,
          contextLines: 2,
          expand: false,
        })
        return compare
      }
    }
  }

  await fs.ensureDir(snapshotsDir)
  await fs.writeFile(writePath, stdout)

  return false
}
