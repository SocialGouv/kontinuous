const fs = require("fs-extra")

// const { ctx } = require("@modjo-plugins/core")
const cleanGitRef = require("~common/utils/clean-git-ref")
const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const slug = require("~common/utils/slug")

const artifactPath = "/artifacts"

module.exports = function () {
  async function addOneArtifactsUpload(req, res) {
    const { repository: repositoryMixed, branch, commit, name } = req.query
    const repository = repositoryFromGitUrl(repositoryMixed)
    const repositoryName = repository.split("/").pop()
    const gitBranch = cleanGitRef(branch)
    const branchSlug = slug(gitBranch)
    const repositorySlug = slug(repositoryName)
    const dir = `${artifactPath}/${repositorySlug}/${branchSlug}/${commit}`
    const file = `${dir}/${name}.yaml`
    if (!(await fs.pathExists(file))) {
      return res.status(404).json({ error: "not found" })
    }
    const content = await fs.readFile(file, "binary")
    res.setHeader("Content-Type", "text/x-yaml")
    res.setHeader("Content-Disposition", `attachment; filename=${name}.yaml`)
    res.setHeader("Content-Length", content.length)
    res.write(content, "binary")
    res.end()
  }

  return [addOneArtifactsUpload]
}
