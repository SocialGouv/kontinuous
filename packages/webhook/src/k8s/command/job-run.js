const jobDelete = require("./job-delete")
const jobCreate = require("./job-create")

module.exports = async (manifest) => {
  const { namespace, name } = manifest.metadata
  await jobDelete(namespace, name)
  await jobCreate(manifest)
}
