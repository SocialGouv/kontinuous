const { constants } = require("fs")
const fs = require("fs/promises")
const util = require("util")
const childProcess = require("child_process")

const exec = util.promisify(childProcess.exec)

const handleWorkspaceDep = async ({
  cwd,
  workspaceDir,
  depWorkspaceName,
  depWorkspaceDir,
  package,
}) => {
  await fs.cp(
    `${cwd}/${depWorkspaceDir}`,
    `${cwd}/${workspaceDir}/${depWorkspaceName}`,
    {
      recursive: true,
      filter: (src) => {
        if (src.includes("node_modules/") || src.endsWith("node_modules")) {
          return false
        }
        return true
      },
    }
  )

  const commonPackage = JSON.parse(
    await fs.readFile(`${cwd}/${workspaceDir}/${depWorkspaceName}/package.json`)
  )
  package.dependencies = {
    ...(commonPackage.dependencies || {}),
    ...(package.dependencies || {}),
  }
  package.devDependencies = {
    ...(commonPackage.devDependencies || {}),
    ...(package.devDependencies || {}),
  }

  package._moduleAliases = {
    ...package._moduleAliases,
    [depWorkspaceName]: depWorkspaceName,
  }

  delete package.dependencies[depWorkspaceName]
}

const handleDependencies = async (
  deps,
  { cwd, workspaces, workspaceDir, package }
) => {
  for (const [depWorkspaceName, version] of Object.entries(deps)) {
    if (version === "workspace:^") {
      const depWorkspaceDir = workspaces[depWorkspaceName]
      if (!depWorkspaceDir) {
        throw new Error(`dep workspace "${depWorkspaceName}" not found`)
      }
      await handleWorkspaceDep({
        cwd,
        depWorkspaceName,
        depWorkspaceDir,
        workspaceDir,
        package,
      })
    }
  }
}

const getWorkspaces = async (cwd) => {
  const { stdout: list } = await exec(`yarn workspaces list --json`, {
    cwd,
  })
  const workspaces = {}
  for (const item of list.split("\n")) {
    if (!item) {
      continue
    }
    const ws = JSON.parse(item)
    workspaces[ws.name] = ws.location
  }
  return workspaces
}

const copyFromToIfNotExists = async (from, to) => {
  try {
    await fs.access(to, constants.F_OK)
    return
  } catch (_err) {
    // dot nothing
  }
  try {
    await fs.access(from, constants.F_OK)
  } catch (_err) {
    return
  }
  return fs.cp(from, to)
}

module.exports = async (workspaceName, options = {}) => {
  const {
    cwd = process.cwd(),
    copyREADME = true,
    copyREADMEFile = "README.md",
    copyLICENSE = true,
    copyLICENSEFile = "LICENSE",
  } = options

  const workspaces = await getWorkspaces(cwd)

  const workspaceDir = workspaces[workspaceName]
  if (!workspaceDir) {
    throw new Error(`workspace "${workspaceName}" not found`)
  }

  const workspacePackageFile = `${cwd}/${workspaceDir}/package.json`
  const package = JSON.parse(await fs.readFile(workspacePackageFile))
  const config = {
    cwd,
    workspaces,
    workspaceDir,
    package,
  }
  await handleDependencies(package.dependencies, config)
  await handleDependencies(package.devDependencies, config)

  if (copyREADME) {
    await copyFromToIfNotExists(
      `${cwd}/${copyREADMEFile}`,
      `${workspaceDir}/${copyREADMEFile}`
    )
  }

  if (copyLICENSE) {
    await copyFromToIfNotExists(
      `${cwd}/${copyLICENSEFile}`,
      `${workspaceDir}/${copyLICENSEFile}`
    )
  }

  await fs.writeFile(workspacePackageFile, JSON.stringify(package))

  process.stdout.write("workspace package ready to be released on npm\n")
}
