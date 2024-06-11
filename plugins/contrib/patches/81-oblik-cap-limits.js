function parseQuantity(quantity) {
  const quantityRegex = /^([0-9.]+)([a-zA-Z]*)$/
  const match = quantity.match(quantityRegex)

  if (!match) {
    throw new Error(`Invalid quantity format: ${quantity}`)
  }

  let value = parseFloat(match[1])
  const unit = match[2]

  switch (unit) {
    case "m": // MilliCPU
      value /= 1000
      break
    case "Ki":
      value *= 1024
      break
    case "Mi":
      value *= 1024 * 1024
      break
    case "Gi":
      value *= 1024 * 1024 * 1024
      break
    case "Ti":
      value *= 1024 * 1024 * 1024 * 1024
      break
    case "Pi":
      value *= 1024 * 1024 * 1024 * 1024 * 1024
      break
    case "Ei":
      value *= 1024 * 1024 * 1024 * 1024 * 1024 * 1024
      break
    case "n":
      value /= 1e9
      break
    case "u":
    case "µ":
      value /= 1e6
      break
    case "k":
      value *= 1e3
      break
    case "M":
      value *= 1e6
      break
    case "G":
      value *= 1e9
      break
    case "T":
      value *= 1e12
      break
    case "P":
      value *= 1e15
      break
    case "E":
      value *= 1e18
      break
    default:
      break
  }

  return value
}

module.exports = async function oblikCapLimits(manifests, _options, _context) {
  const resourcesToCheck = ["Deployment", "StatefulSet", "CronJob"]
  const annotationsToCheck = [
    "oblik.socialgouv.io/min-request-cpu",
    "oblik.socialgouv.io/min-request-memory",
    "oblik.socialgouv.io/max-request-cpu",
    "oblik.socialgouv.io/max-request-memory",
    "oblik.socialgouv.io/min-limit-cpu",
    "oblik.socialgouv.io/min-limit-memory",
    "oblik.socialgouv.io/max-limit-cpu",
    "oblik.socialgouv.io/max-limit-memory",
  ]

  manifests.forEach((manifest) => {
    if (!resourcesToCheck.includes(manifest.kind)) {
      return
    }
    const annotations = manifest.metadata.annotations || {}
    const { containers } =
      manifest.kind === "CronJob"
        ? manifest.spec.jobTemplate.spec.template.spec
        : manifest.spec.template.spec

    containers.forEach((container) => {
      const containerName = container.name
      const { requests = {}, limits = {} } = container.resources || {}
      const containerResources = { requests, limits }

      annotationsToCheck.forEach((annotation) => {
        const defaultAnnotationValue = annotations[annotation]
          ? parseQuantity(annotations[annotation])
          : null
        const containerSpecificAnnotation = `${annotation}.${containerName}`
        const containerSpecificAnnotationValue = annotations[
          containerSpecificAnnotation
        ]
          ? parseQuantity(annotations[containerSpecificAnnotation])
          : null

        const annotationValue =
          containerSpecificAnnotationValue !== null
            ? containerSpecificAnnotationValue
            : defaultAnnotationValue

        if (annotationValue === null) {
          return
        }
        const resourceTarget = annotation.includes("cpu") ? "cpu" : "memory"
        const resourceType = annotation.includes("request")
          ? "requests"
          : "limits"

        const resourceValue = containerResources[resourceType][resourceTarget]
          ? parseQuantity(containerResources[resourceType][resourceTarget])
          : null

        if (resourceValue !== null) {
          if (
            (annotation.includes("min") && resourceValue < annotationValue) ||
            (annotation.includes("max") && resourceValue > annotationValue)
          ) {
            containerResources[resourceType][resourceTarget] = annotationValue
            container.resources ||= {}
            container.resources[resourceType] ||= {}
            container.resources[resourceType][resourceTarget] ||=
              containerResources[resourceType][resourceTarget]
          }
        }
      })
    })
  })
}
