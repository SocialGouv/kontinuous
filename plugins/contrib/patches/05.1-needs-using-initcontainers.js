const kontinuousNeedsImage =
  "ghcr.io/socialgouv/kontinuous/wait-needs:sha-3ffe6fa"
// const kontinuousNeedsImage = "ghcr.io/socialgouv/kontinuous/wait-needs:1"
// const kontinuousNeedsImage = "harbor.fabrique.social.gouv.fr/sre/kontinuous/wait-needs:v1"

module.exports = async (manifests, _options, context) => {
  const { utils } = context
  const { kindIsRunnable } = utils

  for (const manifest of manifests) {
    const annotations = manifest.metadata?.annotations
    if (!annotations) {
      continue
    }

    const jsonNeeds = annotations["kontinuous/plugin.needs"]
    if (annotations["kontinuous/plugin.needs"]) {
      delete annotations["kontinuous/plugin.needs"]
    }

    if (!kindIsRunnable(manifest.kind)) {
      continue
    }

    if (!jsonNeeds) {
      continue
    }
    const needs = JSON.parse(jsonNeeds)
    const needsManifests = []
    for (const need of needs) {
      const matchingDeps = manifests.filter((m) => {
        if (!m.metadata?.annotations) {
          return false
        }
        for (const [key, val] of Object.entries(m.metadata.annotations)) {
          if (key.startsWith("kontinuous/depname.")) {
            if (need === val) {
              return true
            }
          }
        }
        return false
      })
      needsManifests.push(...matchingDeps)
    }

    const { spec } = manifest.spec.template
    if (!spec.initContainers) {
      spec.initContainers = []
    }
    if (!spec.volumes) {
      spec.volumes = []
    }
    const { initContainers, volumes } = spec

    const dependencies = needsManifests.map((m) => {
      const { metadata } = m
      const { namespace, labels } = metadata
      const resourceName = labels["kontinuous/resourceName"]
      const selectors = [["kontinuous/resourceName", resourceName]]
      return { namespace, selectors }
    })

    const jsonDependencies = JSON.stringify(dependencies)

    const initContainer = {
      name: "kontinuous-wait-needs",
      image: kontinuousNeedsImage,
      env: [
        { name: "WAIT_NEEDS", value: jsonDependencies },
        { name: "KUBECONFIG", value: "/secrets/kubeconfig" },
        {},
      ],
      volumeMounts: [
        {
          name: "kontinuous-wait-needs-kubeconfig",
          mountPath: "/secrets",
        },
      ],
      imagePullPolicy: "Always", // let for kontinuous-wait-dep image dev
    }

    const volume = {
      name: "kubeconfig",
      secret: {
        secretName: "kubeconfig",
        items: [
          {
            key: "KUBECONFIG",
            path: "kubeconfig",
          },
        ],
      },
    }

    volumes.push(volume)
    initContainers.push(initContainer)
  }

  return manifests
}
