const waitableKinds = ["Deployment", "StatefulSet", "Job"]

/**
 *
 * @param {Kontinuous.Manifest} manifest
 * @param {Kontinuous.Manifest["kind"][]} customWaitableKinds
 * @returns {manifest is Kontinuous.WaitableManifest}
 */
module.exports = (manifest, customWaitableKinds = []) =>
  waitableKinds.includes(manifest.kind) ||
  customWaitableKinds.includes(manifest.kind)
