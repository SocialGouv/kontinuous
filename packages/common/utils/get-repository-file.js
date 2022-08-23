const path = require("path")
const os = require("os")
const { mkdtemp } = require("fs/promises")

const fs = require("fs-extra")

const normalizeRepositoryUrl = require("./normalize-repository-url")
const defaultLogger = require("./logger")
const asyncShell = require("./async-shell")

module.exports = async ({
  ref,
  file,
  repositoryUrl,
  logger = defaultLogger,
  protocol = "https",
}) => {
  const repoUrl = normalizeRepositoryUrl(repositoryUrl, protocol)

  logger.debug({ repoUrl }, `downloading file "${file}" ...`)

  try {
    const tmpdir = await mkdtemp(path.join(os.tmpdir(), "gitclone-"))

    await asyncShell(
      `
        git clone
          --depth 1
          --branch ${ref}
          --filter=blob:none
          --no-checkout
          --sparse
          ${repoUrl}
          .
      `,
      { cwd: tmpdir }
    )

    await asyncShell(`git checkout ${ref} -- ${file}`, {
      cwd: tmpdir,
    })

    const content = await fs.readFile(`${tmpdir}/${file}`, {
      encoding: "utf-8",
    })

    await fs.remove(tmpdir)

    return content
  } catch (error) {
    logger.error(error)
  }
}
