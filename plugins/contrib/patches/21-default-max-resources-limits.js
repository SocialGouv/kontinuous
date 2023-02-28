/*
see https://kubernetes.io/docs/concepts/workloads/pods/init-containers/#resources
Given the ordering and execution for init containers, the following rules for resource usage apply:
- The highest of any particular resource request or limit defined on all init containers is the effective init request/limit. If any resource has no resource limit specified this is considered as the highest limit.
- The Pod's effective request/limit for a resource is the higher of:
    - the sum of all app containers request/limit for a resource
    - the effective init request/limit for a resource
*/

const {
  getCpuAsNum,
  getMemoryAsNum,
  getCpuAsString,
  getMemoryAsString,
} = require("../lib/kubernetes-resource-helpers")

module.exports = (manifests, options, { logger }) => {
  const { cpu = 3, memory = "8Gi" } = options

  for (const manifest of manifests) {
    const spec = manifest.spec?.template?.spec
    const { kind, metadata } = manifest
    const { name, namespace } = metadata

    const containers = spec?.containers || []

    let sumOfContainersCpuLimit = 0
    let sumOfContainersMemoryLimit = 0

    for (const container of containers) {
      if (!container.resources) {
        container.resources = {}
      }
      const { resources: { limits = {} } = {} } = container
      if (limits.cpu === undefined || limits.cpu === null) {
        logger.warn(
          `defaulting cpu limit: ${namespace}/${kind}/${name} container ${container.name} does not have cpu limits defaulting to ${cpu}`
        )
        limits.cpu = cpu
      }
      if (limits.memory === undefined || limits.memory === null) {
        logger.warn(
          `defaulting memory limit: ${namespace}/${kind}/${name} container ${container.name} does not have memory limits defaulting to ${memory}`
        )
        limits.memory = memory
      }
      sumOfContainersCpuLimit += getCpuAsNum(limits.cpu)
      sumOfContainersMemoryLimit += getMemoryAsNum(limits.memory)
    }

    const initContainers = spec?.initContainers || []
    for (const initContainer of initContainers) {
      if (!initContainer.resources) {
        initContainer.resources = {}
      }
      const {
        resources: { limits },
      } = initContainer
      if (limits.cpu === undefined || limits.cpu === null) {
        limits.cpu = getCpuAsString(sumOfContainersCpuLimit)
      }
      if (limits.memory === undefined || limits.memory === null) {
        limits.memory = getMemoryAsString(sumOfContainersMemoryLimit)
      }
    }
  }

  return manifests
}
