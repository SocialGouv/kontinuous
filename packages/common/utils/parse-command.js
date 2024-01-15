/**
 *
 * @param {string|string[]} arg
 * @returns {[cmd: string, args:string[]]}
 */
module.exports = (arg) => {
  if (typeof arg === "string") {
    arg = arg
      .split(" ")
      .map((a) => a.trim())
      .filter((a) => !!a)
  }
  const [cmd, ...args] = arg
  return [cmd, args]
}
