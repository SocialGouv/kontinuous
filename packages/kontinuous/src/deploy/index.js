const { spawn } = require("child_process")
const crypto = require("crypto")

const fs = require("fs-extra")
const axios = require("axios")
const qs = require("qs")
const FormData = require("form-data")

const ctx = require("~common/ctx")
const needKapp = require("~common/utils/need-kapp")
const yaml = require("~common/utils/yaml")
const timeLogger = require("~common/utils/time-logger")
const slug = require("~common/utils/slug")
const parseCommand = require("~common/utils/parse-command")
const validateMd5 = require("~common/utils/validate-md5")

const needBin = require("~/bin/need-bin")
const build = require("~/build")
const logs = require("~/logs")
const { getStatus, setStatus } = require("~/status")

const deployHooks = require("./deploy-hooks")

module.exports = async (options) => {
  ctx.provide()

  const config = ctx.require("config")
  const logger = ctx.require("logger")

  const {
    environment,
    gitRepositoryUrl,
    gitRepositoryName: repositoryName,
    statusUrl,
    webhookUri,
    webhookToken: token,
    kubeconfig,
    kubeconfigContext,
  } = config

  const onWebhook = options.W

  try {
    let manifestsFile = options.F
    let manifests
    if (!manifestsFile) {
      const result = await build(options)
      manifestsFile = result.manifestsFile
      manifests = result.manifests
    } else {
      manifests = await fs.readFile(manifestsFile, { encoding: "utf-8" })
    }

    if (onWebhook) {
      const manifestsHash = crypto.createHmac("md5", manifests).digest("hex")

      let jobHash
      if (options.jobHash) {
        if (validateMd5(options.jobHash)) {
          jobHash = options.jobHash
        } else {
          jobHash = crypto.createHmac("md5", options.jobHash).digest("hex")
        }
      } else {
        jobHash = manifestsHash
      }

      logger.info(
        `deploying via webhook ${repositoryName} job#${jobHash} manifests#md5:${manifestsHash}`
      )

      logger.info("uploading custom manifests to deploy")

      const form = new FormData()
      form.append("manifests", manifests, {
        filename: "manifests.yaml",
        contentType: "text/x-yaml",
      })

      const query = qs.stringify({
        project: config.projectName,
        env: environment,
        token,
        hash: jobHash,
        repositoryUrl: gitRepositoryUrl,
      })

      const url = `${webhookUri}/api/v1/oas/hooks/custom?${query}`
      try {
        const response = await axios.request({
          method: "POST",
          url,
          data: form,
          headers: form.getHeaders(),
        })
        logger.debug(response.data)
        logger.info("uploaded custom manifests to deploy")
      } catch (error) {
        if (error.response) {
          logger.error(`upload error: status ${error.response.status}`)
          logger.error(error.response.data)
          logger.debug(error.response.headers)
          logger.error(error.request)
        } else if (error.request) {
          logger.error(`upload error: request`)
          logger.error(error.request)
        } else {
          logger.error(`upload error: ${error.message}`)
        }
      }

      if (options.onWebhookDetach) {
        return
      }

      await logs({
        ...options,
        env: environment,
        event: "custom",
        repository: gitRepositoryUrl,
        branch: jobHash,
        commit: "0000000000000000000000000000000000000000",
      })
      if (statusUrl) {
        const { status, ok } = await getStatus({ url: statusUrl })
        if (ok !== true) {
          const errorMsg = `status not ok, it returned: ${status}`
          logger.error(errorMsg)
          throw new Error(errorMsg)
        }
      }

      return
    }

    if (statusUrl) {
      await setStatus({ url: statusUrl, status: "loading", ok: null })
    }

    logger.info(
      { kubeconfig, kubeconfigContext },
      "let's deploy on kubernetes with kapp"
    )

    const allManifests = yaml.loadAll(manifests)

    const charts = config.chart?.join(",")

    const kappApp = charts
      ? slug(`${repositoryName}-${charts}`)
      : repositoryName

    const kappWaitTimeout =
      options.timeout || process.env.KS_DEPLOY_TIMEOUT || "15m0s"

    await needBin(needKapp)

    const deployWithKapp = async () => {
      const [cmd, args] = parseCommand(`
        kapp deploy
          ${
            kubeconfigContext ? `--kubeconfig-context ${kubeconfigContext}` : ""
          }
          --app label:kontinuous/kapp=${kappApp}
          --logs-all
          --wait-timeout ${kappWaitTimeout}
          --dangerous-override-ownership-of-existing-resources
          --yes
          -f ${manifestsFile}
      `)

      try {
        await new Promise((resolve, reject) => {
          const proc = spawn(cmd, args, {
            encoding: "utf-8",
            env: {
              ...process.env,
              ...(kubeconfig ? { KUBECONFIG: kubeconfig } : {}),
            },
          })

          proc.stdout.on("data", (data) => {
            process.stdout.write(data.toString())
          })
          proc.stderr.on("data", (data) => {
            logger.warn(data.toString())
          })
          proc.on("close", (code) => {
            if (code === 0) {
              resolve()
            } else {
              reject(new Error(`kapp deploy failed with exit code ${code}`))
            }
          })
        })
      } catch (err) {
        logger.error(err)
        throw err
      }
    }

    await deployHooks(allManifests, "pre")

    const namespacesManifests = allManifests.filter(
      (manifest) => manifest.kind === "Namespace"
    )
    const namespaces = namespacesManifests.map(
      (manifest) => manifest.metadata.name
    )
    let namespacesLabel = ""
    if (namespaces.length > 0) {
      namespacesLabel = `to namespace${
        namespaces.length > 1 ? "s" : ""
      } "${namespaces.join('","')}"`
    }
    logger.info(`deploying ${repositoryName} ${namespacesLabel}`)

    const elapsed = timeLogger({
      logger,
      logLevel: "info",
    })

    await deployWithKapp()

    await deployHooks(allManifests, "post")

    elapsed.end({
      label: `🚀 kontinuous pipeline ${repositoryName} ${environment} ${namespacesLabel}`,
    })

    if (statusUrl) {
      await setStatus({ url: statusUrl, status: "success", ok: true })
    }
  } catch (err) {
    if (statusUrl) {
      await setStatus({ url: statusUrl, status: "failed", ok: false })
    }
    throw err
  }
}
