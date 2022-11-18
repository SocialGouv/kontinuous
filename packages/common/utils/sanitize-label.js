module.exports = (label, prefixIfNeeded = "v") => {
  label = label.replace(/[^a-zA-Z0-9._-]+/g, "-")
  if (!/^[a-zA-Z0-9]/.test(label)) {
    label = `${prefixIfNeeded}${label}`
  }
  return label
}
