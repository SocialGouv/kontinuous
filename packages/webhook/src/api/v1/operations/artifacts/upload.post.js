const fs = require("fs-extra")

// const { ctx } = require("@modjo-plugins/core")
const cleanGitRef = require("~common/utils/clean-git-ref")
const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const slug = require("~common/utils/slug")

const artifactPath = "/artifacts"

module.exports = function () {
  async function addOneArtifactsUpload(req, res) {
    const { repository: repositoryMixed, branch, commit } = req.query
    const repository = repositoryFromGitUrl(repositoryMixed)
    const repositoryName = repository.split("/").pop()
    const gitBranch = cleanGitRef(branch)
    const branchSlug = slug(gitBranch)
    const repositorySlug = slug(repositoryName)
    const [manifests] = req.files
    const dir = `${artifactPath}/${repositorySlug}/${branchSlug}/${commit}`
    await fs.ensureDir(dir)
    const file = `${dir}/manifests.yaml`
    await fs.writeFile(file, manifests.buffer)
    return res.status(201).json({ success: true })
  }

  return [addOneArtifactsUpload]
}
