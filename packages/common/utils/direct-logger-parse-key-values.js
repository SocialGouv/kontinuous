const separator = "\u3000"
module.exports = (msg) => {
  const parts = msg.split(separator)
  const [message, ...pairs] = parts
  const data = {}
  for (const pair of pairs) {
    const pparts = pair.split("=")
    const key = pparts.shift()
    data[key] = pparts.join("=").trim()
  }
  return [message.trim(), data]
}
