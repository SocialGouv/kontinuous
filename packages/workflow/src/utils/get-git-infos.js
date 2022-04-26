const logger = require("~common/utils/logger")
const isVersionTag = require("~common/utils/is-version-tag")

const getGitRef = require("~common/utils/get-git-ref")
const getGitTags = require("~common/utils/get-git-tags")
const getGitSha = require("~common/utils/get-git-sha")
const getGitRepository = require("~common/utils/get-git-repository")
const getGitUrl = require("~common/utils/get-git-url")
const { buildCtx } = require("~/build/ctx")

module.exports = async (
  cwd = process.cwd(),
  env = buildCtx.get("env") || process.env,
  reloadCache = false
) => {
  const infos = reloadCache ? {} : buildCtx.get("gitInfos") || {}
  try {
    if (!infos.GIT_TAGS) {
      if (env.KW_GIT_TAGS) {
        infos.GIT_TAGS = env.KW_GIT_TAGS.split(",")
      } else if (env.KW_GIT_TAGS === undefined || env.KW_GIT_TAGS === null) {
        infos.GIT_TAGS = await getGitTags(cwd)
      } else {
        infos.GIT_TAGS = []
      }
    }
    if (!infos.GIT_REF) {
      infos.GIT_REF =
        env.KW_GIT_REF ||
        (await getGitRef(cwd)) ||
        infos.GIT_TAGS.filter((t) => isVersionTag(t))
          .sort()
          .pop()
    }
    if (!infos.GIT_SHA) {
      infos.GIT_SHA = env.KW_GIT_SHA || (await getGitSha(cwd))
    }
    if (!infos.GIT_REPOSITORY) {
      infos.GIT_REPOSITORY =
        env.KW_GIT_REPOSITORY ||
        (await getGitRepository(
          cwd,
          env.KW_GIT_REPOSITORY_URL || (await getGitUrl(cwd))
        ))
    }
  } catch (e) {
    logger.error(
      "Unable to retrieve git info, ensure that you have git installed and the current directroy is a git repository"
    )
    throw e
  }
  buildCtx.set("gitInfos", infos)
  return infos
}
