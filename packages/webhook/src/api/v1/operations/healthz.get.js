module.exports = function () {
  async function getOneHealthz(_req) {
    return { message: "Hi !" }
  }

  return [getOneHealthz]
}
