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
  packageDef,
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
  packageDef.dependencies = {
    ...(commonPackage.dependencies || {}),
    ...(packageDef.dependencies || {}),
  }
  packageDef.devDependencies = {
    ...(commonPackage.devDependencies || {}),
    ...(packageDef.devDependencies || {}),
  }

  packageDef._moduleAliases = {
    ...packageDef._moduleAliases,
    [depWorkspaceName]: depWorkspaceName,
  }

  delete packageDef.dependencies[depWorkspaceName]
}

const handleDependencies = async (
  deps,
  { cwd, workspaces, workspaceDir, packageDef }
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
        packageDef,
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
  const packageDef = JSON.parse(await fs.readFile(workspacePackageFile))
  const config = {
    cwd,
    workspaces,
    workspaceDir,
    packageDef,
  }
  await handleDependencies(packageDef.dependencies, config)
  await handleDependencies(packageDef.devDependencies, config)

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

  await fs.writeFile(workspacePackageFile, JSON.stringify(packageDef))

  process.stdout.write("workspace package ready to be released on npm\n")
}
