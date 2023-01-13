const kindsRunnable = require("./kinds-runnable")

/**
 *
 * @param {Kontinuous.Manifest} manifest
 * @returns {manifest is Kontinuous.RunnableManifest}
 */
module.exports = (manifest) => kindsRunnable.includes(manifest.kind)
