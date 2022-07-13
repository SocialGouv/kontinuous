module.exports = function ({ services: { custom } }) {
  return [
    async (req, res) => {
      const { env, hash, repositoryUrl } = req.query
      const [manifestsFile] = req.files

      const manifests = manifestsFile.buffer.toString("utf-8")

      const runJob = await custom({ env, hash, repositoryUrl, manifests })

      if (!runJob) {
        return res.status(204).json({ message: "no-op" })
      }
      runJob()

      return res.status(202).json({ message: "accepted" })
    },
  ]
}
