module.exports = async (manifests, _options, { utils }) => {
  const { KontinuousPluginError } = utils
  const errors = []
  for (const manifest of manifests) {
    if (manifest.kind === "Secret") {
      errors.push(
        `manifest with kind Secret found, no plain secret allowed, please use SealedSecret instead, name: ${manifest.metadata?.name}`
      )
    }
  }

  if (errors.length > 0) {
    throw new KontinuousPluginError(
      `Following errors occurred: ${errors.join("\n")}`
    )
  }
}
