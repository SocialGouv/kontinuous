const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")

const fs = require("fs-extra")

const kubectlRetry = require("./kubectl-retry")
const yaml = require("./yaml")

module.exports = async (
  manifest,
  { kubeconfig, kubeconfigContext, rootDir = os.tmpdir() } = {}
) => {
  const tmpdir = await mkdtemp(path.join(rootDir, "tmp-"))
  const file = `${tmpdir}/clean-resource.yaml`

  const dump = Array.isArray(manifest)
    ? yaml.dumpAll(manifest)
    : yaml.dump(manifest)

  await fs.writeFile(file, dump)

  await kubectlRetry(`delete --ignore-not-found=true -f ${file}`, {
    kubeconfig,
    kubeconfigContext,
  })
}
