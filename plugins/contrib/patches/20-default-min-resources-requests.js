const runnableKinds = ["Deployment", "Job", "StatefulSet", "DaemonSet"]

const {
  getCpuAsNum,
  getMemoryAsNum,
  getCpuAsString,
  getMemoryAsString,
} = require("../lib/kubernetes-resource-helpers")

module.exports = (manifests, options, { logger }) => {
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
      cpu = getCpuAsString(minimumCpuNumber)
      logger.trace(
        `calculated min cpu: ${cpuNodeConfig}/${maxPods}${
          cpuMarginAsNum ? ` + ${cpuAvoidOutOfpodsMargin}` : ""
        } = ${cpu}`
      )
    } else {
      cpu = "0"
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
      memory = getMemoryAsString(minimumMemoryNumber)
      logger.trace(
        `calculated min memory: ${memoryNodeConfig}/${maxPods}${
          memoryMarginAsNum ? ` + ${memoryAvoidOutOfpodsMargin}` : ""
        } = ${memory}`
      )
    } else {
      memory = 0
    }
  }

  for (const manifest of manifests) {
    const { kind } = manifest

    if (!runnableKinds.includes(kind)) {
      continue
    }

    const containers = manifest.spec?.template?.spec?.containers
    if (containers && containers.length > 0) {
      let cpuByContainer = cpu
      let memoryByContainer = memory
      if (containers.length > 1) {
        const cpuByContainerNumber =
          Math.ceil((getCpuAsNum(cpu) / containers.length) * 1000) / 1000
        const memoryByContainerNumber = Math.ceil(
          getMemoryAsNum(memory) / containers.length
        )
        cpuByContainer = getCpuAsString(cpuByContainerNumber)
        memoryByContainer = getMemoryAsString(memoryByContainerNumber)
      }
      for (const container of containers) {
        if (!container.resources) {
          container.resources = {}
        }

        // if limits are specified and are lower than request we adjust request up
        const cpuLimit = container.resources?.limits?.cpu
        if (cpuLimit) {
          const cpuLimitNumber = getCpuAsNum(cpuLimit)
          let cpuByContainerNumber = getCpuAsNum(cpuByContainer)
          if (cpuLimitNumber < cpuByContainerNumber) {
            cpuByContainerNumber = cpuLimitNumber
            cpuByContainer = getCpuAsString(cpuByContainerNumber)
          }
        }
        const memoryLimit = container.resources?.limits?.memory
        if (memoryLimit) {
          const memoryLimitNumber = getMemoryAsNum(memoryLimit)
          let memoryByContainerNumber = getCpuAsNum(cpuByContainer)
          if (memoryLimitNumber < memoryByContainerNumber) {
            memoryByContainerNumber = memoryLimitNumber
            memoryByContainer = getMemoryAsString(memoryByContainerNumber)
          }
        }

        if (!container.resources.requests) {
          container.resources.requests = {}
        }
        const definedCpu = container.resources.requests?.cpu
        if (definedCpu === undefined || definedCpu === null) {
          container.resources.requests.cpu = cpuByContainer.toString()
        }
        const definedMemory = container.resources.requests?.memory
        if (definedMemory === undefined || definedMemory === null) {
          container.resources.requests.memory = memoryByContainer.toString()
        }
      }
    }

    const initContainers = manifest.spec?.template?.spec?.initContainers || []
    const { initContainersResourcesRequests = {} } = options
    for (const container of initContainers) {
      if (!container.resources) {
        container.resources = {}
      }
      if (!container.resources.requests) {
        container.resources.requests = {}
      }
      const definedCpu = container.resources.requests?.cpu
      if (definedCpu === undefined || definedCpu === null) {
        container.resources.requests.cpu =
          initContainersResourcesRequests.cpu || "0"
      }
      const definedMemory = container.resources.requests?.memory
      if (definedMemory === undefined || definedMemory === null) {
        container.resources.requests.memory =
          initContainersResourcesRequests.memory || "0"
      }
    }
  }

  return manifests
}
