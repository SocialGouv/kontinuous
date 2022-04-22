const isVersionTag = require("./is-version-tag")

module.exports = (ref) => {
  ref = ref.replace("refs/heads/", "").replace("refs/tags/", "")
  if (ref === "master" || ref === "main") {
    return "preprod"
  }
  if (isVersionTag(ref)) {
    return "prod"
  }
  return "dev"
}
