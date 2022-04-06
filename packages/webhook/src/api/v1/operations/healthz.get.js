module.exports = function () {
  async function getOneHealthz(_req) {
    return { message: "Salut les gens !" }
  }

  return [getOneHealthz]
}
