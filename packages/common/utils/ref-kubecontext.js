const refEnv = require("./ref-env")
const envKubecontext = require("./env-kubecontext")

module.exports = (ref, env) => envKubecontext(env || refEnv(ref))
