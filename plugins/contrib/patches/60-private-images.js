module.exports = (manifests, options) => {
  const {
    kinds = ["Deployment", "StatefulSet", "DaemonSet"],
    imagePrefixes = [],
  } = options
  manifests.forEach((manifest) => {
    if (kinds.includes(manifest.kind)) {
      // Iterate through each container in the spec
      manifest.spec.template.spec.containers.forEach((container) => {
        if (
          imagePrefixes.some((imagePrefix) =>
            container.image.startsWith(imagePrefix)
          )
        ) {
          // Ensure imagePullSecrets array exists
          if (!manifest.spec.template.spec.imagePullSecrets) {
            manifest.spec.template.spec.imagePullSecrets = []
          }

          // Check if the secret is already added to avoid duplicates
          const secretExists =
            manifest.spec.template.spec.imagePullSecrets.some(
              (secret) => secret.name === "harbor-pull-secret"
            )
          if (!secretExists) {
            // Add the harbor-pull-secret
            manifest.spec.template.spec.imagePullSecrets.push({
              name: "harbor-pull-secret",
            })
          }
        }
      })
    }
  })
}
