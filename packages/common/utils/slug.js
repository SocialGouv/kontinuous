const { createHash } = require("crypto")
const slugify = require("slugify")

slugify.extend({
  "!": "-",
  ".": "-",
  "/": "-",
  "@": "-",
  _: "-",
  "~": "-",
  ":": "-",
})

const KUBERNETS_MAX_NAME_LENGTH = 63
const SUFFIX_SHA_LENGTH = 8

/**
 * @param {string} name
 * @param {number} len
 * @returns number
 */
const suffix = (name, len = SUFFIX_SHA_LENGTH) => {
  const hex = Buffer.from(
    createHash("sha256").update(name).digest("hex")
  ).toString()

  return parseInt(hex, 16).toString(36).slice(0, len)
}

/**
 *
 * @param {string} name
 * @param {number} len
 * @param {number} shalen
 * @param {slugSource} [string]
 * @returns
 */
const slugString = (name, len, shalen, slugSource = name) => {
  let slugified = slugify(name, {
    lower: true,
  })

  if (!/^[a-z]/.exec(slugified)) {
    slugified = `env-${slugified}`
  }

  slugified = slugified.replace(/-+$/, "") // domain doesn't support --

  if ((shalen > 0 && slugified.length > len) || slugified !== name) {
    const shortSlug = slugified.slice(0, len - shalen - 2)
    slugified = `${shortSlug}${shortSlug.endsWith("-") ? "" : "-"}${suffix(
      slugSource,
      shalen
    )}`
  }
  return slugified
}

/**
 *
 * @param {string[]|string} mixed
 * @param {undefined | ({maxLength?:number, partMaxLength?:number, glue?:string})} options
 * @returns string
 */
const slug = (mixed, options = {}) => {
  const {
    maxLength = KUBERNETS_MAX_NAME_LENGTH,
    shaLength = SUFFIX_SHA_LENGTH,
    partMaxLength = Infinity,
    glue = "-",
  } = options

  if (!Array.isArray(mixed)) {
    mixed = [mixed]
  }

  const parts = []
  for (const part of mixed) {
    if (!part) {
      continue
    }
    let name
    let pml
    if (Array.isArray(part)) {
      ;[name, pml] = part
    } else {
      name = part
      pml = partMaxLength
    }
    const slugified = slugString(name, pml, 0)
    parts.push(slugified)
  }

  const slugified = slugString(
    parts.join(glue),
    maxLength,
    shaLength,
    mixed.join(glue)
  )

  return slugified
}

module.exports = slug
