const { ctx } = require("@modjo-plugins/core")

const envKubecontext = require("~common/utils/env-kubecontext")

const refEnv = require("~common/utils/ref-env")
const getRemoteKontinuousEnvironmentPatterns = require("~common/utils/get-remote-kontinuous-environment-patterns")

module.exports = async (repositoryUrl, ref, env) => {
  const logger = ctx.require("logger")

  if (!env) {
    const environmentPatterns = await getRemoteKontinuousEnvironmentPatterns(
      repositoryUrl,
      ref,
      { logger }
    )
    env = refEnv(ref, environmentPatterns)
  }

  return env ? envKubecontext(env) : false
}
