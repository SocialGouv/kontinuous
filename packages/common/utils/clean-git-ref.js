module.exports = (ref) =>
  ref
    .replace("refs/heads/", "")
    .replace("refs/tags/", "")
    .replace(/^tags\//, "")
