module.exports = (tag) => tag.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase()
