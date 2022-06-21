const yarnNotIgnore = [
  ".yarn/patches",
  ".yarn/plugins",
  ".yarn/releases",
  ".yarn/sdks",
  ".yarn/versions",
  ".yarn/cache",
]

module.exports = (src) => {
  if (src.includes("node_modules/") || src.endsWith("node_modules")) {
    return false
  }
  if (src.includes(".pnp.")) {
    return false
  }
  if (src.includes(".yarn/")) {
    return yarnNotIgnore.some((notIgnore) => src.includes(notIgnore))
  }
  return true
}
