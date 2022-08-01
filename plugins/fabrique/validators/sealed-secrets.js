const axios = require("axios")
const retry = require("async-retry")

module.exports = async (manifests, options, context) => {
  const { logger, utils } = context
  const { handleAxiosError } = utils

  let { kubesealEndpoint } = options

  if (!kubesealEndpoint) {
    const { clusters } = options
    const { values } = context
    const cluster = values.isProd ? clusters.prod : clusters.dev
    if (cluster) {
      ;({ kubesealEndpoint } = cluster)
    }
  }
  if (!kubesealEndpoint) {
    throw new Error(`missing "kubesealEndpoint" required option`)
  }
  const endpoint = `${kubesealEndpoint}/v1/verify`

  const verifySecret = async (manifest) => {
    let error
    let status

    const content = JSON.stringify(manifest)

    const { namespace } = manifest.metadata

    try {
      await retry(
        async (bail) => {
          try {
            logger.debug(
              { endpoint, namespace, name: manifest.metadata.name },
              `kubeseal verifying`
            )
            await axios.post(endpoint, content)
            logger.debug(
              { endpoint, namespace },
              `${manifest.metadata.name} is sealed properly`
            )
          } catch (err) {
            if (err.response?.status === 429) {
              logger.debug(
                { endpoint },
                `kubeseal verify endpoint rate limit exceeded, trying`
              )
              throw new Error("rate limit exceeded")
            }
            bail(err)
          }
        },
        {
          retries: 10,
          factor: 1,
          minTimeout: 1000,
          maxTimeout: 3000,
        }
      )
      status = true
    } catch (err) {
      error = err
      if (err.response?.status === 409) {
        status = false
        logger.error(
          { endpoint, namespace },
          `${manifest.metadata.name} is not sealed properly`
        )
      } else {
        status = null
        handleAxiosError(error, logger)
      }
    }

    return { manifest, status, error }
  }

  const results = await Promise.all(
    manifests.filter(({ kind }) => kind === "SealedSecret").map(verifySecret)
  )

  const errors = results
    .filter(({ status }) => status !== true)
    .map(({ manifest, status, error }) => {
      if (status === false) {
        return `${manifest.metadata.name} is not sealed properly for namespace ${manifest.metadata.namespace}`
      }
      return `Kubeseal API call failed for SealedSecret manifest "${
        manifest.metadata.name
      }": ${error.response.status} ${JSON.stringify(
        error.response.headers
      )} ${JSON.stringify(error.response.data)}`
    })

  if (errors.length > 0) {
    throw new Error(`Following errors occurred: ${errors.join("\n")}`)
  }
}
