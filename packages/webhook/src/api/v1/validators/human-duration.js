const re = /^(\d+h)?(\d+m)?(\d+s)?$/
module.exports = () => (str) => re.test(str)
