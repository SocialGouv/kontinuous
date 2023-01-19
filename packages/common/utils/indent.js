module.exports = function indent(string, w = 2) {
  if (typeof w === "number") w = new Array(w + 1).join(" ")
  return string.replace(/^(?!$)/gm, w)
}
