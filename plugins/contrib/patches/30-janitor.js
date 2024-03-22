const parseDuration = require("parse-duration")
const { persistPatterns } = require("../lib/persist-convention")

function resetDateToLastPeriodBasedOnDuration(date, durationSeconds) {
  if (durationSeconds > 86400) {
    date.setHours(0, 0, 0, 0)
  } else if (durationSeconds > 3600) {
    date.setMinutes(0, 0, 0)
  } else if (durationSeconds > 60) {
    date.setSeconds(0, 0)
  }
}

module.exports = (manifests, options, { config, utils }) => {
  if (config.environment !== "dev") {
    return manifests
  }

  const {
    permanentDevEnvironmentBranches = [...persistPatterns],
    mode = "expires", // expire or ttl
    ttl = "7d",
    resetLastPeriod = true,
  } = options

  let { expires = null } = options

  const { patternMatch } = utils

  if (patternMatch(config.gitBranch, permanentDevEnvironmentBranches)) {
    return
  }

  const annotationKey = `janitor/${mode}`

  let annotationValue
  switch (mode) {
    case "expires": {
      if (expires === null) {
        const date = new Date()
        const duration = parseDuration(ttl)
        if (resetLastPeriod) {
          resetDateToLastPeriodBasedOnDuration(date, duration)
        }
        date.setTime(date.getTime() + duration)
        const formattedDate = date.toISOString()
        expires = `${formattedDate.slice(0, -5)}Z`
      }
      annotationValue = expires
      break
    }
    case "ttl": {
      annotationValue = ttl
      break
    }
    default: {
      throw new Error(`Unknown mode ${mode}`)
    }
  }

  for (const manifest of manifests) {
    if (manifest.kind === "Namespace") {
      if (!manifest.metadata) {
        manifest.metadata = {}
      }
      if (!manifest.metadata.annotations) {
        manifest.metadata.annotations = {}
      }
      manifest.metadata.annotations[annotationKey] = annotationValue
    }
  }

  return manifests
}
