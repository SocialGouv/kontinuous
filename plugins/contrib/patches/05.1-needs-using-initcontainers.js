const kontinuousNeedsImage = "ghcr.io/socialgouv/kontinuous/wait-needs:v1.95.15"
// const kontinuousNeedsImage = "harbor.fabrique.social.gouv.fr/sre/kontinuous/wait-needs:v1"

const getDeps = require("../lib/get-needs-deps")

module.exports = async (manifests, _options, context) => {
  const { utils, logger } = context
  const { kindIsRunnable, KontinuousPluginError } = utils

  const deps = getDeps(manifests, context)

  for (const manifest of manifests) {
    const { metadata, kind } = manifest
    const annotations = metadata?.annotations
    if (!annotations) {
      continue
    }

    const jsonNeeds = annotations["kontinuous/plugin.needs"]
    // if (annotations["kontinuous/plugin.needs"]) {
    //   delete annotations["kontinuous/plugin.needs"]
    // }

    if (!kindIsRunnable(kind)) {
      continue
    }

    if (!jsonNeeds) {
      continue
    }
    const needs = JSON.parse(jsonNeeds)
    const needsManifests = new Set()
    for (const need of needs) {
      const matchingDeps = deps[need]
      if (matchingDeps.length === 0) {
        const msg = `could not find dependency "${need}" for kind "${kind}" name "${metadata.name}" on namespace "${metadata.namespace}"`
        logger.error({ need }, msg)
        throw new KontinuousPluginError(msg)
      }
      needsManifests.add(...matchingDeps)
    }

    const { spec } = manifest.spec.template
    if (!spec.initContainers) {
      spec.initContainers = []
    }
    if (!spec.volumes) {
      spec.volumes = []
    }
    const { initContainers, volumes } = spec

    const dependencies = [...needsManifests].map((m) => {
      const { namespace, labels, name } = m.metadata
      const resourceName = labels["kontinuous/resourceName"]
      const selectors = { "kontinuous/resourceName": resourceName }
      return {
        namespace,
        kind: m.kind,
        name,
        selectors,
        needOnce: m.kind === "Job",
      }
    })

    const jsonDependencies = JSON.stringify(dependencies)

    const initContainer = {
      name: "kontinuous-wait-needs",
      image: kontinuousNeedsImage,
      env: [
        {
          name: "WAIT_NEEDS_ANNOTATIONS_REF",
          value: [
            manifest.metadata.namespace,
            kind,
            manifest.metadata.name,
          ].join("/"),
        },
        { name: "WAIT_NEEDS", value: jsonDependencies },
        { name: "KUBECONFIG", value: "/secrets/kubeconfig" },
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
      name: "kontinuous-wait-needs-kubeconfig",
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
    initContainers.unshift(initContainer)

    spec.progressDeadlineSeconds = 1200000 // 20 minutes
  }

  return manifests
}
