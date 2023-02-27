const parseUrl = require("parse-url")

function trimSlash(path) {
  return path.charAt(0) === "/" ? path.slice(1) : path
}

function isChecksum(str) {
  return /^[a-f0-9]{40}$/i.test(str)
}

function getBranch(str, obj) {
  const segs = str.split("#")
  let branch
  if (segs.length > 1) {
    branch = segs[segs.length - 1]
  }
  if (!branch && obj.hash && obj.hash.charAt(0) === "#") {
    branch = obj.hash.slice(1)
  }
  return branch || "master"
}

function name(str) {
  return str ? str.replace(/\.git$/, "") : null
}

function owner(str) {
  if (!str) return null
  const idx = str.indexOf(":")
  if (idx > -1) {
    return str.slice(idx + 1)
  }
  return str
}

module.exports = (str) => {
  if (typeof str !== "string" || !str.length) {
    return null
  }

  if (str.indexOf("git@gist") !== -1 || str.indexOf("//gist") !== -1) {
    return null
  }

  // parse the URL
  let obj
  if (str.includes(":")) {
    obj = parseUrl(str)
  } else {
    obj = { pathname: str }
  }
  if (typeof obj.pathname !== "string" || !obj.pathname.length) {
    return null
  }

  if (!obj.host && /^git@/.test(str) === true) {
    // return the correct host for git@ URLs
    const urlObject = parseUrl(`http://${str}`)
    obj.host = urlObject.host
  }

  obj.pathname = trimSlash(obj.pathname)
  obj.path = obj.pathname
  obj.filepath = null

  const seg = obj.path.split("/").filter(Boolean)
  const hasBlob = seg[2] === "blob"
  if (hasBlob && !isChecksum(seg[3])) {
    ;[, , obj.branch] = seg
    if (seg.length > 4) {
      obj.filepath = seg.slice(4).join("/")
    }
  }

  const blob = str.indexOf("blob")
  if (blob !== -1) {
    obj.blob = str.slice(blob + 5)
  }

  const tree = str.indexOf("tree")
  if (tree !== -1) {
    const idx = tree + 5
    let branch = str.slice(idx)
    const slash = branch.indexOf("/")
    if (slash !== -1) {
      branch = branch.slice(0, slash)
    }
    obj.branch = branch
  }

  obj.owner = owner(seg[0])

  obj.name = name(seg[1])

  if (seg.length > 1 && obj.owner && obj.name) {
    obj.repo = `${obj.owner}/${obj.name}`
  } else {
    const href = obj.href.split(":")
    if (href.length === 2 && obj.href.indexOf("//") === -1) {
      obj.repo = obj.repo || href[href.length - 1]
      const repoSegments = obj.repo.split("/")
      ;[obj.owner, obj.name] = repoSegments
    } else {
      const match = obj.href.match(/\/([^/]*)$/)
      obj.owner = match ? match[1] : null
      obj.repo = null
    }

    if (obj.repo && (!obj.owner || !obj.name)) {
      const segs = obj.repo.split("/")
      if (segs.length === 2) {
        ;[obj.owner, obj.name] = segs
      }
    }
  }

  if (!obj.branch) {
    obj.branch = seg[2] || getBranch(obj.path, obj)
    if (seg.length > 3) {
      obj.filepath = seg.slice(3).join("/")
    }
  }

  obj.host = obj.host || "github.com"
  obj.owner = obj.owner || null
  obj.name = obj.name || null
  obj.repository = obj.repo
  return obj
}
