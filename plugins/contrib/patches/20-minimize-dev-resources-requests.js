const { cpuParser, memoryParser } = require("kubernetes-resource-parser")

const runnableKinds = ["Deployment", "Job", "StatefulSet", "DaemonSet"]

const getCpuAsNum = (cpu) => (typeof cpu === "number" ? cpu : cpuParser(cpu))
const getMemoryAsNum = (memory) =>
  typeof memory === "number" ? memory : memoryParser(memory)

module.exports = (manifests, options, { config, logger }) => {
  if (config.environment !== "dev") {
    return manifests
  }

  const {
    requests = {},
    avoidOutOfpods = false,
    avoidOutOfpodsMargin = {},
    nodeConfig = {},
  } = options

  const {
    maxPods = 110,
    cpu: cpuNodeConfig,
    memory: memoryNodeConfig,
  } = nodeConfig

  const {
    cpu: cpuAvoidOutOfpodsMargin = 0,
    memory: memoryAvoidOutOfpodsMargin = 0,
  } = avoidOutOfpodsMargin

  let { cpu, memory } = requests

  if (cpu === undefined || cpu === null) {
    if (avoidOutOfpods) {
      if (!cpuNodeConfig) {
        throw new Error(
          `you have enable "avoidOutOfpods" and doesn't specified default cpu request, so it requires missing nodeConfig.cpu to make the calculation`
        )
      }
      const cpuNodeAsNum = getCpuAsNum(cpuNodeConfig)
      const cpuMarginAsNum = getCpuAsNum(cpuAvoidOutOfpodsMargin)

      const minimumCpuNumber = cpuNodeAsNum / maxPods + cpuMarginAsNum
      cpu = Math.round(minimumCpuNumber * 1000) / 1000
      logger.trace(
        `calculated min cpu: ${cpuNodeConfig}/${maxPods}${
          cpuMarginAsNum ? ` + ${cpuAvoidOutOfpodsMargin}` : ""
        } = ${cpu}`
      )
    } else {
      cpu = 0
    }
  }
  if (memory === undefined || memory === null) {
    if (avoidOutOfpods) {
      if (!memoryNodeConfig) {
        throw new Error(
          `you have enable "avoidOutOfpods" and doesn't specified default memory request, so it requires missing nodeConfig.memory to make the calculation`
        )
      }
      const memoryNodeAsNum = getMemoryAsNum(memoryNodeConfig)
      const memoryMarginAsNum = getMemoryAsNum(memoryAvoidOutOfpodsMargin)
      const minimumMemoryNumber = memoryNodeAsNum / maxPods + memoryMarginAsNum
      memory = `${(
        Math.round((minimumMemoryNumber * 1000) / 1024 ** 2) / 1000
      ).toString()}Mi`
      logger.trace(
        `calculated min memory: ${memoryNodeConfig}/${maxPods}${
          memoryMarginAsNum ? ` + ${memoryAvoidOutOfpodsMargin}` : ""
        } = ${memory}`
      )
    } else {
      memory = 0
    }
  }

  const setupContainersRequests = (containers = []) => {
    for (const container of containers) {
      if (!container.resources) {
        container.resources = {}
      }
      container.resources.requests = {
        cpu: cpu.toString(),
        memory: memory.toString(),
      }
    }
  }

  for (const manifest of manifests) {
    const { kind } = manifest

    if (!runnableKinds.includes(kind)) {
      continue
    }

    setupContainersRequests(manifest.spec?.template?.spec?.containers)
    setupContainersRequests(manifest.spec?.template?.spec?.initContainers)
  }

  return manifests
}
