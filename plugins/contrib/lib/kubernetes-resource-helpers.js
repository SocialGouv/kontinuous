const { cpuParser, memoryParser } = require("kubernetes-resource-parser")

const getCpuAsNum = (cpu) => (typeof cpu === "number" ? cpu : cpuParser(cpu))

const getMemoryAsNum = (memory) =>
  typeof memory === "number" ? memory : memoryParser(memory)

const getCpuAsString = (cpu) => `${Math.round(cpu * 1000) / 1000}`

const getMemoryAsString = (memory) =>
  `${Math.round(memory / 1024 ** 2).toString()}Mi`

module.exports = {
  getCpuAsNum,
  getMemoryAsNum,
  getCpuAsString,
  getMemoryAsString,
}
