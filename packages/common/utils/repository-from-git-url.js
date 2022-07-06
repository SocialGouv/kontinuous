const GitUrlParse = require("git-url-parse")

module.exports = (gitUrl) => {
  const url = GitUrlParse(gitUrl)
  let { pathname } = url
  if (pathname.startsWith("/")) {
    pathname = pathname.slice(1)
  }
  if (pathname.endsWith(".git")) {
    pathname = pathname.slice(0, pathname.length - 4)
  }
  return pathname
}
