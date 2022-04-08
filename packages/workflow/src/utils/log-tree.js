class LogTree {
  constructor(options = {}) {
    this.settings = {
      keyword: {
        name: "name",
        children: "children",
      },
      maxLevel: 1000,
      ...options,
    }
  }

  static setPre(hasNext, parentPre = "") {
    return `${parentPre}${hasNext ? "├" : "└"}── `
  }

  static setTransferPre(parentPre = "", hasNext = false) {
    return `${parentPre}${hasNext ? "│" : " "}   `
  }

  parse(tree, level = 0, parentPre = "", treeStr = "") {
    if (!this.check(tree, level)) return ""

    if (Array.isArray(tree)) {
      tree.forEach((child, index) => {
        const hasNext = !!tree[index + 1]
        const children = child[this.settings.keyword.children]

        treeStr += `${LogTree.setPre(hasNext, parentPre)}${
          child[this.settings.keyword.name]
        }\n`

        if (children) {
          treeStr += this.parse(
            children,
            level + 1,
            LogTree.setTransferPre(parentPre, hasNext)
          )
        }
      })
    } else {
      const children = tree[this.settings.keyword.children]
      treeStr = `${tree[this.settings.keyword.name]}\n`
      if (children) {
        treeStr += this.parse(children, level + 1)
      }
    }

    return treeStr
  }

  check(tree, level) {
    if (typeof tree !== "object") return false
    if (level >= this.settings.maxLevel) return false

    return true
  }
}

module.exports = (tree, options) => {
  const logtree = new LogTree(options)
  return logtree.parse(tree)
}
