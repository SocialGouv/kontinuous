/** @type {Kontinuous.PatchFunction} */
module.exports = async (manifests, _options, _context) =>
  manifests.filter((m) => m.kind !== "Config")
