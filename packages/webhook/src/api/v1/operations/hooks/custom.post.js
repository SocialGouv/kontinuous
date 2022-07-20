module.exports = function ({ services: { custom } }) {
  return [
    async (req, res) => {
      const { env, cluster, hash, repositoryUrl } = req.query
      const [manifestsFile] = req.files

      if (!(cluster || env)) {
        return res
          .status(400)
          .json({ message: `need one of "cluster" or "env" query parameter` })
      }

      const manifests = manifestsFile.buffer.toString("utf-8")

      const runJob = await custom({
        cluster,
        env,
        hash,
        repositoryUrl,
        manifests,
      })

      if (!runJob) {
        return res.status(204).json({ message: "no-op" })
      }
      runJob()

      return res.status(202).json({ message: "accepted" })
    },
  ]
}
