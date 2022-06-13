const re = /\b([a-f0-9]{32})\b/
module.exports = () => (str) => re.test(str)
