const re = /^[a-zA-Z0-9-]+$/
module.exports = () => (str) => re.test(str)
