const kontinuousNeedsImage = "ghcr.io/socialgouv/kontinuous/wait-needs:v1.155.2"
// const kontinuousNeedsImage = "harbor.fabrique.social.gouv.fr/sre/kontinuous/wait-needs:v1"

const getDeps = require("../lib/get-needs-deps")
const kindIsWaitable = require("../lib/kind-is-waitable")

module.exports = async (manifests, options, context) => {
  const { utils, logger } = context
  const { KontinuousPluginError } = utils

  const { kubernetesMethod = "kubeconfig" } = options
  const { serviceAccountName = "kontinuous-sa" } = options
  const { surviveOnBrokenCluster } = options

  const deps = getDeps(manifests, options, context)

  for (const manifest of manifests) {
    const { metadata, kind } = manifest
    const annotations = metadata?.annotations
    if (!annotations) {
      continue
    }

    const yamlNeeds = annotations["kontinuous/plugin.needs"]
    // if (annotations["kontinuous/plugin.needs"]) {
    //   delete annotations["kontinuous/plugin.needs"]
    // }

    if (!kindIsWaitable(kind, options.customWaitableKinds)) {
      continue
    }

    if (!yamlNeeds) {
      continue
    }
    const { yaml } = utils
    const needs = yaml.load(yamlNeeds)
    const needsManifests = new Set()
    for (const need of needs) {
      const matchingDeps = deps[need]
      if (matchingDeps.length === 0) {
        const msg = `could not find dependency "${need}" for kind "${kind}" name "${metadata.name}" on namespace "${metadata.namespace}"`
        logger.error({ need }, msg)
        throw new KontinuousPluginError(msg)
      }
      matchingDeps.forEach((d) => needsManifests.add(d))
    }

    const { spec } = manifest.spec.template

    if (
      (!spec.serviceAccountName || spec.serviceAccountName === "default") &&
      kubernetesMethod === "serviceaccount"
    ) {
      spec.serviceAccountName = serviceAccountName
    }

    if (kind === "Deployment") {
      manifest.spec.progressDeadlineSeconds =
        options.progressDeadlineSeconds || 1200000 // 20 minutes
    }

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
        ...(kubernetesMethod === "kubeconfig"
          ? [{ name: "KUBECONFIG", value: "/secrets/kubeconfig" }]
          : []),
        ...(surviveOnBrokenCluster
          ? [{ name: "SURVIVE_ON_BROKEN_CLUSTER", value: "true" }]
          : []),
      ],
      volumeMounts: [
        ...(kubernetesMethod === "kubeconfig"
          ? [
              {
                name: "kontinuous-wait-needs-kubeconfig",
                mountPath: "/secrets",
              },
            ]
          : []),
      ],
      imagePullPolicy: "Always", // let for kontinuous-wait-dep image dev
    }

    if (kubernetesMethod === "kubeconfig") {
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
    }

    initContainers.unshift(initContainer)
  }

  return manifests
}
