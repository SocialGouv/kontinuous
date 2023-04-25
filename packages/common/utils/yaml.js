const yaml = require("yaml")
const jsYaml = require("js-yaml")

const load = (input, retroCompat = true) =>
  retroCompat
    ? yaml.parse(input.toString(), { schema: "yaml-1.1" })
    : jsYaml.load(input)

const dump = (input, retroCompat = true) =>
  retroCompat
    ? yaml.stringify(input, { schema: "yaml-1.1" })
    : jsYaml.dump(input)

const dumpAll = (manifests) =>
  manifests.map((manifest) => dump(manifest)).join("---\n")

const loadAll = (input, retroCompat = true) => {
  if (input.trimStart().slice(0, 1) === "[") {
    const obj = load(`arr: ${input}`, retroCompat)
    return obj.arr
  }

  const documents = []

  const append = (arr) => {
    const doc = arr.join("\n").trim()
    if (doc.length > 0) {
      const obj = load(doc, retroCompat)
      documents.push(obj)
    }
  }

  let currentDoc = []
  for (const line of input.split("\n")) {
    if (line.startsWith("---")) {
      append(currentDoc)
      currentDoc = []
    } else {
      currentDoc.push(line)
    }
  }
  append(currentDoc)

  return documents
}

const loadValue = (input, retroCompat = true) => {
  if (input.includes("\n")) {
    input = `value: |
${input
  .split("\n")
  .map((line) => `  ${line}`)
  .join("\n")}`
  } else {
    input = `value: ${input}`
  }
  const data = load(input, retroCompat)
  return data.value
}

module.exports = {
  parse: yaml.parse,
  load,
  loadAll,
  loadValue,
  dump,
  dumpAll,
}
