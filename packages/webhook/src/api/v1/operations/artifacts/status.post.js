const fs = require("fs-extra")

// const { ctx } = require("@modjo-plugins/core")
const { reqCtx } = require("@modjo-plugins/express/ctx")
const cleanGitRef = require("~common/utils/clean-git-ref")
const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const slug = require("~common/utils/slug")

const artifactPath = "/artifacts"

module.exports = function () {
  async function addOneArtifactsStatus(req, res) {
    const { repository: repositoryMixed, branch, commit } = req.query
    const repository = repositoryFromGitUrl(repositoryMixed)
    const repositoryName = repository.split("/").pop()
    const gitBranch = cleanGitRef(branch)
    const branchSlug = slug(gitBranch)
    const repositorySlug = slug(repositoryName)
    const project = reqCtx.get("project")
    const dir = `${artifactPath}/${project}/${repositorySlug}/${branchSlug}/${commit}`
    await fs.ensureDir(dir)
    const file = `${dir}/status.json`
    const { status, ok } = req.body
    await fs.writeFile(
      file,
      JSON.stringify({
        status,
        ok,
      })
    )
    return res.status(200).json({ message: "OK" })
  }

  return [addOneArtifactsStatus]
}
