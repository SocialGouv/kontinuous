const os = require("os")
const path = require("path")
const fs = require("fs-extra")

const asyncShell = require("./async-shell")

const normalizeRepositoryUrl = require("./normalize-repository-url")
const getLogger = require("./get-logger")

const supported = {
  github: ".com",
  gitlab: ".com",
  bitbucket: ".com",
  gitea: ".com",
  "git.sr.ht": ".ht",
}

function parse(src) {
  const match =
    /^(?:(?:https:\/\/)?([^:/]+\.[^:/]+)\/|git@([^:/]+)[:/]|([^/]+):)?([^/\s]+)\/([^/\s#]+)(?:((?:\/[^/\s#]+)+))?(?:\/)?(?:#(.+))?/.exec(
      src
    )
  if (!match) {
    throw new Error(`could not parse ${src}`)
  }

  const site = match[1] || match[2] || match[3] || "github.com"
  const tldMatch = /\.([a-z]{2,})$/.exec(site)
  const tld = tldMatch ? tldMatch[0] : null
  const siteName = tld ? site.replace(tld, "") : site

  const user = match[4]
  const name = match[5].replace(/\.git$/, "")
  const subdir = match[6]
  const ref = match[7] || "HEAD"

  const domain = `${siteName}${
    tld || supported[siteName] || supported[site] || ""
  }`

  const url = `https://${domain}/${user}/${name}`
  const ssh = `git@${domain}:${user}/${name}`

  const mode = supported[siteName] || supported[site] ? "tar" : "git"

  return { site: siteName, user, name, ref, url, ssh, subdir, mode }
}

module.exports = async (target, logger = getLogger()) => {
  const base = path.join(os.homedir(), ".degit")
  const repo = parse(target)
  const dir = path.join(base, repo.site, repo.user, repo.name)
  const mapJsonFile = path.join(dir, "map.json")
  if (!(await fs.pathExists(mapJsonFile))) {
    return true
  }
  const mapJson = await fs.readFile(mapJsonFile, { encoding: "utf-8" })
  const map = JSON.parse(mapJson)
  const hash = map[repo.ref]
  if (!hash) {
    return true
  }

  logger.debug(
    `🍒 checking if last ref has changed for ${repo.url}#${repo.ref}`
  )
  const lsRemote = await asyncShell(
    `git ls-remote ${normalizeRepositoryUrl(repo.url)} ${repo.ref}`
  )
  const refs = lsRemote.split("\t")
  if (refs.length < 2) {
    return true
  }
  const [lastHash] = refs
  return lastHash !== hash
}
