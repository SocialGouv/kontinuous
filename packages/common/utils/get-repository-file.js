const path = require("path")
const os = require("os")
const { mkdtemp } = require("fs/promises")

const fs = require("fs-extra")

const normalizeRepositoryUrl = require("./normalize-repository-url")
const defaultLogger = require("./logger")
const asyncShell = require("./async-shell")
const gitEnv = require("./git-env")

module.exports = async ({
  ref,
  file,
  repositoryUrl,
  logger = defaultLogger,
  deployKey,
}) => {
  const protocol = deployKey ? "ssh" : "https"

  const repoUrl = normalizeRepositoryUrl(repositoryUrl, protocol)

  const env = gitEnv({ deployKey })

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
      { cwd: tmpdir, env }
    )

    await asyncShell(`git checkout ${ref} -- ${file}`, {
      cwd: tmpdir,
      env,
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
