const getTreeInfos = {}

getTreeInfos.default = (resource) => {
  const { manifest } = resource
  return [{ name: `name: ${manifest.metadata.name}` }]
}

getTreeInfos.Namespace = (resource) => {
  const { manifest } = resource
  return [{ name: `name: ${manifest.metadata.name}` }]
}

getTreeInfos.Ingress = (resource) => {
  const { manifest } = resource
  const redirect =
    manifest.metadata?.annotations[
      "nginx.ingress.kubernetes.io/permanent-redirect"
    ]
  return [
    ...(manifest.spec?.rules
      ? [
          {
            name: "hosts",
            children: manifest.spec.rules.map(({ host }) => ({
              name: `https://${host}`,
            })),
          },
        ]
      : []),
    ...(redirect
      ? [
          {
            name: "redirect",
            children: [{ name: redirect }],
          },
        ]
      : []),
  ]
}

getTreeInfos.Deployment = (resource) => {
  const { manifest } = resource
  const containers = manifest.spec?.template?.spec?.containers || []
  const initContainers = manifest.spec?.template?.spec?.initContainers || []
  return [
    ...containers.map((container) => ({
      name: container.name,
      children: [
        {
          name: `image: ${container.image}`,
        },
        ...(container.ports
          ? [
              {
                name: `port${
                  container.ports.length > 1 ? "s" : ""
                }: ${container.ports
                  .map(({ containerPort }) => containerPort)
                  .join(",")}`,
              },
            ]
          : []),
      ],
    })),
    ...initContainers.map((container) => ({
      name: `${container.name} (init)`,
      children: [
        {
          name: `image: ${container.image}`,
        },
      ],
    })),
  ]
}

getTreeInfos.Service = (resource) => {
  const { manifest } = resource
  const { ports } = manifest.spec
  const children = []
  if (ports) {
    const portStr = ports.map(
      (port) =>
        `${port.name ? `${port.name}=` : ""}${port.port}:${port.targetPort}`
    )
    children.push({
      name: `port${ports.length > 1 ? "s" : ""}: ${portStr}`,
    })
  }
  return children
}

getTreeInfos.ConfigMap = (resource) => {
  const { manifest } = resource
  return [{ name: `name: ${manifest.metadata.name}` }]
}

getTreeInfos.SealedSecret = (resource) => {
  const { manifest } = resource
  return [{ name: `name: ${manifest.metadata.name}` }]
}

getTreeInfos.Job = (resource) => {
  const { manifest } = resource
  const containers = manifest.spec?.template?.spec?.containers
  const initContainers = manifest.spec?.template?.spec?.initContainers
  return [
    ...(containers
      ? containers.map((container) => ({
          name: container.name,
          children: [
            {
              name: `image: ${container.image}`,
            },
          ],
        }))
      : []),
    ...(initContainers
      ? initContainers.map((container) => ({
          name: `${container.name} (init)`,
          children: [
            {
              name: `image: ${container.image}`,
            },
          ],
        }))
      : []),
  ]
}

getTreeInfos.CronJob = (resource) => {
  const { manifest } = resource
  const containers =
    manifest.spec?.jobTemplate?.spec?.template?.spec?.containers
  const initContainers =
    manifest.spec?.jobTemplate?.spec?.template?.spec?.initContainers
  return [
    { name: `schedule: ${manifest.spec.schedule}` },
    ...(containers
      ? containers.map((container) => ({
          name: container.name,
          children: [
            {
              name: `image: ${container.image}`,
            },
          ],
        }))
      : []),
    ...(initContainers
      ? initContainers.map((container) => ({
          name: `${container.name} (init)`,
          children: [
            {
              name: `image: ${container.image}`,
            },
          ],
        }))
      : []),
  ]
}

module.exports = async (manifests, _options, { ctx, utils }) => {
  const logger = ctx.require("logger")

  const componentResources = {}
  const globalResources = { kinds: {} }
  for (const manifest of manifests) {
    if (!manifest.metadata?.labels?.component) {
      if (!globalResources.kinds[manifest.kind]) {
        globalResources.kinds[manifest.kind] = []
      }
      globalResources.kinds[manifest.kind].push({
        name: manifest.metadata?.name,
        manifest,
      })
    } else {
      const { component } = manifest.metadata.labels
      if (!componentResources[component]) {
        componentResources[component] = {
          kinds: {},
        }
      }
      if (!componentResources[component].kinds[manifest.kind]) {
        componentResources[component].kinds[manifest.kind] = []
      }
      componentResources[component].kinds[manifest.kind].push({
        name: manifest.metadata?.name,
        manifest,
      })
    }
  }
  const componentsTree = []
  for (const [name, component] of Object.entries(componentResources)) {
    const resources = []
    for (const [kind, kindResources] of Object.entries(component.kinds)) {
      const children = []
      for (const resource of kindResources) {
        if (getTreeInfos[kind]) {
          children.push(...getTreeInfos[kind](resource))
        }
      }
      resources.push({
        name: `${kind}`,
        children,
      })
    }
    componentsTree.push({
      name,
      children: resources,
    })
  }

  const globalsTree = []
  for (const [kind, kindResources] of Object.entries(globalResources.kinds)) {
    const children = []
    for (const resource of kindResources) {
      if (getTreeInfos[kind]) {
        children.push(...getTreeInfos[kind](resource))
      } else {
        children.push(...getTreeInfos.default(resource))
      }
    }
    globalsTree.push({
      name: `${kind}`,
      children,
    })
  }
  const tree = [
    {
      name: "resources",
      children: componentsTree,
    },
    {
      name: "globals",
      children: globalsTree,
    },
  ]

  const treeStr = utils.logTree(tree)
  logger.debug(`resources summary:\n${treeStr}`)
}
