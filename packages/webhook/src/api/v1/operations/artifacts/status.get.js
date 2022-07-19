const fs = require("fs-extra")

// const { ctx } = require("@modjo-plugins/core")
const { reqCtx } = require("@modjo-plugins/express/ctx")
const cleanGitRef = require("~common/utils/clean-git-ref")
const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const slug = require("~common/utils/slug")

const artifactPath = "/artifacts"

module.exports = function () {
  async function getOneArtifactsStatus(req, res) {
    const { repository: repositoryMixed, branch, commit } = req.query
    const repository = repositoryFromGitUrl(repositoryMixed)
    const repositoryName = repository.split("/").pop()
    const gitBranch = cleanGitRef(branch)
    const branchSlug = slug(gitBranch)
    const repositorySlug = slug(repositoryName)
    const project = reqCtx.get("project")
    const dir = `${artifactPath}/${project}/${repositorySlug}/${branchSlug}/${commit}`
    const file = `${dir}/status.json`
    if (!(await fs.pathExists(file))) {
      return res.status(404).json({ message: "not found" })
    }
    const content = await fs.readFile(file)
    const data = JSON.parse(content)
    return res.status(200).json(data)
  }

  return [getOneArtifactsStatus]
}
