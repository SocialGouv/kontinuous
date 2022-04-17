const jobDelete = require("./job-delete")
const jobCreate = require("./job-create")

module.exports = async (manifest, kubecontext) => {
  const { namespace, name } = manifest.metadata
  await jobDelete(namespace, name, kubecontext)
  await jobCreate(manifest, kubecontext)
}
