const path = require("path")

const validateName = /^[a-zA-Z\d-_]+$/

const recurseDependency = async (param = {}) => {
  const {
    name = "project",
    config,
    logger,
    definition = config,
    beforeChildren = () => {},
    afterChildren = () => {},
  } = param

  const { buildPath } = config

  if (!validateName.test(name)) {
    throw new Error(
      `invalid import name format, expected only alphanumerics hyphens and underscores characters, received: "${name}"`
    )
  }

  const scope = [...(param.scope || []), name]
  const subpath = path.join(
    ...scope.reduce((acc, item) => {
      acc.push("charts", item)
      return acc
    }, [])
  )
  const target = `${buildPath}/${subpath}`

  const callbackParam = {
    name,
    definition,
    scope,
    config,
    logger,
    target,
  }

  await beforeChildren(callbackParam)

  const { dependencies } = definition
  if (dependencies) {
    await Promise.all(
      Object.entries(dependencies).map(([childName, childDefinition]) =>
        recurseDependency({
          ...param,
          name: childName,
          definition: childDefinition,
          scope,
        })
      )
    )
  }

  await afterChildren(callbackParam)
}

module.exports = recurseDependency
