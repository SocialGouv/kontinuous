const re = /\b([a-f0-9]{40})\b/
module.exports = () => (str) => re.test(str)
