const { diffStringsUnified } = require("jest-diff")

const fs = require("fs-extra")

module.exports = async (stdout, name, snapConfig) => {
  const { snapshotsDir, update } = snapConfig
  const writePath = `${snapshotsDir}/${name}`

  let existingSnap = false
  if (await fs.pathExists(writePath)) {
    existingSnap = await fs.readFile(writePath, { encoding: "utf-8" })
  }

  await fs.ensureDir(snapshotsDir)

  const result = {}

  if (stdout !== existingSnap) {
    if (existingSnap) {
      if (!update) {
        result.diff = diffStringsUnified(stdout, existingSnap, {
          includeChangeCounts: true,
          contextLines: 2,
          expand: false,
        })
      } else {
        result.updated = true
        await fs.writeFile(writePath, stdout)
      }
    } else {
      result.created = true
      await fs.writeFile(writePath, stdout)
    }
  }

  return result
}
