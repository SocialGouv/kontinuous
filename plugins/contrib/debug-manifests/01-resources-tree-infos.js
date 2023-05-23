const uniqBy = (key) => (current, i, all) =>
  !all
    .slice(0, i)
    .map((j) => j[key])
    .includes(current[key])

const trimLine = (str, maxLength = 50) => {
  if (str.length > maxLength) {
    return `${str.slice(0, maxLength)}...`
  }
  return str.trim()
}

const getContainerTree = (container, label) => {
  const children = [
    {
      name: `image: ${container.image}`,
    },
  ]
  if (container.command && container.command.length) {
    children.push({
      name: `command: ${trimLine(
        container.command.join(" ").replace(/\n/g, " ")
      )}`,
    })
  }
  if (container.args && container.args.length) {
    children.push({
      name: `args: ${container.args.join(" ").replace(/\n/g, " ")}`,
    })
  }
  if (container.ports && container.ports.length) {
    children.push({
      name: `port${container.ports.length > 1 ? "s" : ""}: ${container.ports
        .map(({ containerPort }) => containerPort)
        .join(",")}`,
    })
  }

  return {
    name: `${container.name}${label ? ` (${label})` : ``}`,
    children,
  }
}

const getPodTree = (name, podSpec) => {
  const { initContainers, containers } = podSpec
  return {
    name,
    children: [
      ...(initContainers
        ? initContainers.map((container) => getContainerTree(container, "init"))
        : []),
      ...(containers ? containers.map(getContainerTree) : []),
    ],
  }
}

const getTreeInfos = {}

getTreeInfos.default = (resource) => {
  const { manifest } = resource
  return [{ name: `name: ${manifest.metadata?.name}` }]
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
            children: manifest.spec.rules
              .map(({ host }) => ({
                name: `https://${host}`,
              }))
              .filter(uniqBy("name")),
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
  return getPodTree(manifest.metadata.name, manifest.spec?.template?.spec)
    .children
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
  return [getPodTree(manifest.metadata.name, manifest.spec?.template?.spec)]
}

getTreeInfos.CronJob = (resource) => {
  const { manifest } = resource
  const { children } = getPodTree(
    manifest.metadata.name,
    manifest.spec?.jobTemplate?.spec?.template?.spec
  )
  return [
    {
      name: manifest.metadata.name,
      children: [{ name: `schedule: ${manifest.spec.schedule}` }, ...children],
    },
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
      const { manifest } = resource
      const { apiVersion } = manifest
      if (apiVersion?.startsWith("kapp.k14s.io")) {
        continue
      }
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

  logger.debug(`📝 resources summary:`)

  const log = logger.child({})
  log.setFields({})

  treeStr.split("\n").forEach((line) => {
    log.debug(line)
  })
}
