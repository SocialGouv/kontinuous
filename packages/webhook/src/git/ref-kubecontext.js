const axios = require("axios")
const GitUrlParse = require("git-url-parse")
const yaml = require("js-yaml")

const { ctx } = require("@modjo-plugins/core")

const envKubecontext = require("~common/utils/env-kubecontext")
const defaultEnvironmentPatterns = require("~common/utils/default-environment-patterns")
const refEnv = require("~common/utils/ref-env")

module.exports = async (repositoryUrl, ref, env) => {
  const logger = ctx.require("logger")

  if (!env) {
    const url = GitUrlParse(repositoryUrl)
    if (!url.resource) {
      url.resource = "github.com"
    }
    const rawUrl = `${GitUrlParse.stringify(
      url,
      "https"
    )}/raw/${ref}/.kontinuous/config.yaml`

    try {
      const response = await axios.get(rawUrl)
      const kontinuousRepoConfig = yaml.load(response.data)
      const environmentPatterns = {
        ...defaultEnvironmentPatterns,
        ...(kontinuousRepoConfig.environmentPatterns || {}),
      }
      env = refEnv(ref, environmentPatterns)
    } catch (error) {
      if (error.response?.status === 404) {
        logger.debug({ rawUrl }, `no config.yaml found`)
      } else {
        logger.error({ rawUrl, error }, `unable to retrieve config.yaml`)
        throw error
      }
    }
  }

  return env ? envKubecontext(env) : false
}
