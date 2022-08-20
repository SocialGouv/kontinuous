const path = require("path")
const { mkdtemp } = require("fs/promises")

const fs = require("fs-extra")

const matchAnnotation = "kontinuous/plugin.preDeploy.cleaner"

const cleanResource = async (manifest, { config, utils }) => {
  const { buildPath } = config
  const { asyncShell, yaml } = utils
  const { kubeconfig, kubeconfigContext } = config
  const dir = await mkdtemp(path.join(buildPath, "tmp-"))
  const file = `${dir}/clean-resource.yaml`
  await fs.writeFile(file, yaml.dump(manifest))
  await asyncShell(
    `kubectl ${
      kubeconfigContext ? `--context ${kubeconfigContext}` : ""
    } delete --ignore-not-found=true -f ${file}`,
    {
      env: {
        ...process.env,
        ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
      },
    }
  )
}

module.exports = async (
  manifests,
  _options,
  { utils, config, logger, needBin }
) => {
  await needBin(utils.needKubectl)

  const promises = []
  for (const manifest of manifests) {
    const { metadata } = manifest
    const clean = metadata?.annotations?.[matchAnnotation]
    if (clean !== "true") {
      continue
    }
    const { kind } = manifest
    const { name } = metadata
    let namespace
    if (kind === "Namespace") {
      namespace = metadata.name
    } else {
      namespace = metadata.namespace
    }
    logger.debug({ kind, name, namespace }, "clean resource")

    promises.push(cleanResource(manifest, { config, utils }))
  }

  if (promises.length === 0) {
    return
  }

  await Promise.all(promises)
  logger.debug("resources cleaned")
}
