module.exports = (key) => key.replace(/[\W_]+/g, "_").toUpperCase()
