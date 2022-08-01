require("jest-specific-snapshot")

const modjo = require("@modjo-plugins/core")

const request = require("supertest")
const yaml = require("~common/utils/yaml")

const server = require("../src/server")

const loggerMock = {
  create: () => {
    const logger = {
      info: () => {},
      warn: (msg) => {
        console.warn(msg)
      },
      error: (msg) => {
        console.error(msg)
      },
      trace: () => {},
      debug: () => {},
      child: () => logger,
    }
    return logger
  },
}

const lightshipMock = {
  create: () => {
    const shutdownHandlers = []
    return {
      registerShutdownHandler: (shutdownHandler) => {
        shutdownHandlers.push(shutdownHandler)
      },
      shutdown: () =>
        Promise.all(
          shutdownHandlers.map((shutdownHandler) => shutdownHandler())
        ),
    }
  },
}

const expose = new Promise((resolve) => {
  process.env.MODJO_DISABLE_NCC_REQUIRE = "true"
  process.env.KUBEWEBHOOK_SUPERTOKEN = "1234"
  process.argv = [process.argv[0], process.argv[1], "dev"]
  const exposer = {
    ready: () => {
      const { ctx } = modjo
      resolve({
        express: ctx.require("express"),
        httpServer: ctx.require("httpServer"),
        lightship: ctx.require("lightship"),
      })
    },
  }
  server({
    plugins: {
      logger: loggerMock,
      lightship: lightshipMock,
    },
    dependencies: {
      exposer,
    },
  })
})

const getAgent = async () => {
  const { express } = await expose
  return request(express)
}

afterAll(async () => {
  const { httpServer, lightship } = await expose
  await Promise.all([lightship.shutdown(), httpServer.close()])
})

describe("kontinuous webhook service", () => {
  it(`expose open-api spec`, async () => {
    const agent = await getAgent()

    const response = await agent.get("/api/v1/spec").send()
    const data = {
      ...response.body,
      info: {
        ...response.body.info,
        version: "0.0.0",
      },
    }
    expect(yaml.dump(data)).toMatchSpecificSnapshot(
      `./__snapshots__/api.v1.spec.yaml`
    )
  })
})
