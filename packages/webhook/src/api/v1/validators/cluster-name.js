// protect against dot-dot-slash directory traversal attack
const re = /\.\./g
module.exports = () => (str) => str === str.replace(re, "")
