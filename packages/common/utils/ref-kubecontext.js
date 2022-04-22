const refEnv = require("./ref-env")
const envKubecontext = require("./env-kubecontext")

module.exports = (ref) => envKubecontext(refEnv(ref))
