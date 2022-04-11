const { createHash } = require("crypto")
const slugify = require("slugify")

slugify.extend({ "!": "-", ".": "-", "/": "-", "@": "-", _: "-", "~": "-" })

const KUBERNETS_MAX_NAME_LENGTH = 63
const SUFFIX_SHA_LENGTH = 8

const suffix = (name) => {
  const hex = Buffer.from(
    createHash("sha256").update(name).digest("hex")
  ).toString()

  return parseInt(hex, 16).toString(36).slice(0, 6)
}

const slugString = (name, len) => {
  let slugified = slugify(name, {
    lower: true,
  })

  if (!/^[a-z]/.exec(slugified)) {
    slugified = `env-${slugified}`
  }

  slugified = slugified.replace(/-+$/, "") // domain doesn't support --

  if (slugified.length > len || slugified !== name) {
    const shortSlug = slugified.slice(0, len - SUFFIX_SHA_LENGTH)
    slugified = `${shortSlug}${shortSlug.endsWith("-") ? "" : "-"}${suffix(
      name
    )}`
  }
  return slugified
}

const slug = (mixed, options = {}) => {
  const {
    maxLength = KUBERNETS_MAX_NAME_LENGTH,
    partMaxLength = Infinity,
    glue = "-",
  } = options

  if (!Array.isArray(mixed)) {
    mixed = [mixed]
  }

  const parts = []
  for (const part of mixed) {
    let name
    let pml
    if (Array.isArray(part)) {
      ;[name, pml] = part
    } else {
      name = part
      pml = partMaxLength
    }
    const slugified = slugString(name, pml)
    parts.push(slugified)
  }

  const slugified = slugString(parts.join(glue), maxLength)

  return slugified
}

module.exports = slug
