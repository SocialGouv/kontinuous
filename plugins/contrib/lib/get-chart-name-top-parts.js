module.exports = (chartPath, deps) => {
  const parts = chartPath.split(".")
  parts.shift()
  let dependencies = deps
  for (const part of [...parts]) {
    if (!dependencies?.[part]) {
      break
    }
    parts.shift()
    dependencies = dependencies[part].dependencies
  }
  return parts
}
