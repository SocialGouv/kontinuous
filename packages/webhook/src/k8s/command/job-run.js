const jobDelete = require("./job-delete")
const jobCreate = require("./job-create")

module.exports = async (manifest, kubeconfig) => {
  const { namespace, name } = manifest.metadata
  await jobDelete(namespace, name, kubeconfig)
  await jobCreate(manifest, kubeconfig)
}
