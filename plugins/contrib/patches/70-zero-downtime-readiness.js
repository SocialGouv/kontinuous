module.exports = function updateDeploymentManifests(manifests, options = {}) {
  // Set default values for options if not provided
  const {
    initialDelaySeconds = 5,
    periodSeconds = 5,
    gracefulShutdownSeconds = 30, // Default graceful shutdown time
    disableAnnotation = "kontinuous/plugin.zeroDowntimeHandled",
  } = options

  manifests.forEach((manifest) => {
    // Check if the resource is a Deployment and doesn't have the disable annotation
    if (
      manifest.kind === "Deployment" &&
      (!manifest.metadata.annotations ||
        manifest.metadata.annotations[disableAnnotation] !== "true")
    ) {
      // Ensure metadata, spec, and template sections exist
      manifest.metadata.annotations = manifest.metadata.annotations || {}
      manifest.spec = manifest.spec || {}
      manifest.spec.template = manifest.spec.template || {}
      manifest.spec.template.spec = manifest.spec.template.spec || {
        containers: [],
        volumes: [],
      }

      // Setup the postStart and preStop lifecycle hooks and readiness probe
      manifest.spec.template.spec.containers.forEach((container) => {
        // Setup lifecycle hooks
        container.lifecycle = {
          postStart: {
            exec: {
              // Command to create the readiness file
              command: [
                "sh",
                "-c",
                "touch /var/run/readiness-check/readiness-file",
              ],
            },
          },
          preStop: {
            exec: {
              // Adding a sleep of gracefulShutdownSeconds before removing the readiness file
              command: [
                "sh",
                "-c",
                `sleep ${gracefulShutdownSeconds}; rm -f /var/run/readiness-check/readiness-file`,
              ],
            },
          },
        }

        // Setup readiness probe
        container.readinessProbe = {
          exec: {
            command: ["cat", "/var/run/readiness-check/readiness-file"],
          },
          initialDelaySeconds,
          periodSeconds,
        }

        // Define a unique and precise mount path
        const mountPath = "/var/run/readiness-check"
        const uniqueVolumeName = "readiness-check-volume"
        container.volumeMounts = container.volumeMounts || []
        container.volumeMounts.push({
          name: uniqueVolumeName,
          mountPath,
        })
      })

      // Ensure the volume does not conflict and is added to the pod spec
      if (
        !manifest.spec.template.spec.volumes.some(
          (v) => v.name === "readiness-check-volume"
        )
      ) {
        manifest.spec.template.spec.volumes.push({
          name: "readiness-check-volume",
          emptyDir: {},
        })
      }
    }
  })

  return manifests
}
