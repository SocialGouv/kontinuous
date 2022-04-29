const yaml = require("yaml")
const jsYaml = require("js-yaml")

const load = (input, retroCompat = true) =>
  retroCompat ? yaml.parse(input, { schema: "yaml-1.1" }) : jsYaml.load(input)

// module.exports.dump = (input) => yaml.stringify(input)
const dump = (input) => jsYaml.dump(input)

const loadAll = (input, retroCompat = true) => {
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

module.exports = {
  load,
  loadAll,
  dump,
}
