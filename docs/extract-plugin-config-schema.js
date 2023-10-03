/*
 * Extract plugins configurations JSON schemas
 */

const { readdirSync, existsSync, writeFileSync } = require("node:fs")
const camelCase = require("lodash.camelcase")

const folders =
  "patches,post-deploy,pre-deploy,validators,values-compilers".split(",")

// extract list of files from a folder
const getFilesFromPath = (path, camelify = false) =>
  (existsSync(path) &&
    readdirSync(path)
      .map((file) => ({
        id: camelify
          ? camelCase(file.replace(/^[\d.]+(.*?)\.js/g, "$1"))
          : file,
        path: file,
      }))
      .filter(Boolean)) ||
  []

const getDependencies = (path) => ({
  type: "object",
  properties: {
    fabrique: {
      $ref: `${path}/plugins/fabrique/config.schema.json`,
    },
    contrib: {
      $ref: `${path}/plugins/contrib/config.schema.json`,
    },
  },
  required: [],
})

const getPluginSchema = (plugin, dependencies) => {
  const properties = folders.reduce((allFolders, folder) => {
    const folderPath = `../plugins/${plugin}/${folder}`
    if (!existsSync(folderPath)) return allFolders
    const folderProperties = getFilesFromPath(folderPath, true).reduce(
      (a, file) => ({
        ...a,
        [camelCase(file.id)]: {
          type: "object",
          title: camelCase(file.id),
          markdownDescription: `Configuration of the ${camelCase(
            file.id
          )} plugin\n\nSee [plugin source](https://github.com/SocialGouv/kontinuous/blob/master/plugins/${plugin}/${folder}/${
            file.path
          })`,
          properties: {
            enabled: {
              title: `${file.id}.enabled`,
              description: "Enable or disable this plugin",
              type: "boolean",
            },
            options: {
              title: `${file.id}.options`,
              markdownDescription: `Options of the ${camelCase(
                file.id
              )} plugin\n\nSee [plugin source](https://github.com/SocialGouv/kontinuous/blob/master/plugins/${plugin}/${folder}/${
                file.path
              })`,
              type: "object",
              properties: {},
            },
          },
        },
      }),
      {}
    )
    return {
      ...allFolders,
      [camelCase(folder)]: {
        type: "object",
        title: folder,
        markdownDescription: `Options from the ${camelCase(folder)} type.`,
        properties: folderProperties,
      },
    }
  }, {})

  const extendsEnum = getFilesFromPath(`../plugins/${plugin}/extends`).map(
    (file) => file.path.replace(/\.yaml$/, "")
  )
  return {
    type: "object",
    title: `kontinuous ${plugin} plugin configuration.`,
    markdownDescription: `See ${plugin} plugin [default configuration](https://github.com/SocialGouv/kontinuous/blob/master/plugins/${plugin}/kontinuous.yaml)`,
    properties: {
      ...properties,
      dependencies,
      extends: {
        title: "Additional configs to extend from",
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              enum: (extendsEnum.length && extendsEnum) || undefined,
            },
            ifEnv: {
              type: "array",
              items: {
                type: "string",
                enum: ["dev", "preprod", "prod"],
              },
            },
          },
        },
      },
    },
  }
}

const baseJsonSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "kontinuous config.yaml JSON schema",
  markdownDescription:
    "See [config documentation](https://socialgouv.github.io/kontinuous/#/./advanced/configuration)",
  type: "object",
  properties: {
    projectName: {
      title:
        "Name of the rancher project. useful to guess the namespace rancher-project-id",
      type: "string",
    },
    ciNamespace: {
      title: "Name of the CI namespace. useful to copy secrets",
      examples: ["ci-myapp"],
      type: "string",
    },
    config: {
      title: "project kontinuous configuration",
      markdownDescription:
        "see [documentation](https://socialgouv.github.io/kontinuous/#/./advanced/configuration)",
      type: "object",
    },
    options: {
      title: "project kontinuous options",
      markdownDescription:
        "see [documentation](https://socialgouv.github.io/kontinuous/#/./advanced/configuration)",
      type: "object",
    },
    dependencies: getDependencies(".."),
  },
  required: [],
}

writeFileSync("./config.schema.json", JSON.stringify(baseJsonSchema, null, 2))

writeFileSync(
  "../plugins/contrib/config.schema.json",
  JSON.stringify(getPluginSchema("contrib", getDependencies("../..")), null, 2)
)

writeFileSync(
  "../plugins/fabrique/config.schema.json",
  JSON.stringify(getPluginSchema("fabrique", getDependencies("../..")), null, 2)
)
