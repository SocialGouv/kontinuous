const deploymentModeEnum = [false, "auto", "search"]

module.exports = (manifests, options, { utils }) => {
  const { KontinuousPluginError } = utils
  const { deploymentMode = "auto" } = options
  if (!deploymentModeEnum.includes(deploymentMode)) {
    throw new KontinuousPluginError(
      `unexpected option deployment mode "${deploymentMode}", expected one of ${JSON.stringify(
        deploymentModeEnum
      )}`
    )
  }

  if (deploymentMode) {
    manifests
      .filter((manifest) => manifest.kind === "Deployment")
      .map((manifest) => {
        if (!manifest.metadata) {
          manifest.metadata = {}
        }
        if (!manifest.metadata.annotations) {
          manifest.metadata.annotations = {}
        }
        manifest.metadata.annotations[
          `reloader.stakater.com/${deploymentMode}`
        ] = "true"
        return manifest
      })
  }

  return manifests
}
