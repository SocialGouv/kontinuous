const defaultMinRequests = require("../20-default-min-resources-requests")

const samples = [
  {
    title: "without initial requests without avoidOutOfpods",
    options: {
      avoidOutOfpods: false,
    },
    manifests: [
      {
        kind: "Deployment",
        spec: { template: { spec: { containers: [{ name: "container1" }] } } },
      },
    ],
    expected: {
      containers: [
        {
          cpu: "0",
          memory: "0",
        },
      ],
    },
  },
  {
    title: "with avoidOutOfpods",
    options: {
      avoidOutOfpods: true,
      nodeConfig: {
        cpu: "7820m",
        memory: "24505448Ki",
      },
    },
    manifests: [
      {
        kind: "Deployment",
        metadata: {
          annotations: {},
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: "container1",
                  resources: { requests: { cpu: 0.5, memory: "64Mi" } },
                },
              ],
            },
          },
        },
      },
    ],
    expected: {
      containers: [
        {
          cpu: 0.5,
          memory: "64Mi",
        },
      ],
    },
  },
  {
    title: "with avoidOutOfpods and no requests",
    options: {
      avoidOutOfpods: true,
      nodeConfig: {
        cpu: "7820m",
        memory: "24505448Ki",
      },
    },
    manifests: [
      {
        kind: "Deployment",
        metadata: {
          annotations: {},
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: "container1",
                  resources: { requests: {} },
                },
              ],
            },
          },
        },
      },
    ],
    expected: {
      containers: [
        {
          cpu: "0.071",
          memory: "218Mi",
        },
      ],
    },
  },
  {
    title: "with avoidOutOfpods, multiple containers and initcontainers",
    options: {
      avoidOutOfpods: true,
      nodeConfig: {
        cpu: "7820m",
        memory: "24505448Ki",
      },
    },
    manifests: [
      {
        kind: "Deployment",
        metadata: {
          annotations: {},
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: "container1",
                  resources: { requests: { cpu: 0.5, memory: "64Mi" } },
                },
                {
                  name: "container2",
                  resources: { requests: { cpu: 1, memory: "128Mi" } },
                },
              ],
              initContainers: [
                {
                  name: "initcontainer1",
                  resources: { requests: { cpu: 0.5, memory: "64Mi" } },
                },
                {
                  name: "initcontainer2",
                  resources: { requests: { cpu: 1, memory: "128Mi" } },
                },
              ],
            },
          },
        },
      },
    ],
    expected: {
      containers: [
        {
          cpu: 0.5,
          memory: "64Mi",
        },
        {
          cpu: 1,
          memory: "128Mi",
        },
      ],
      initContainers: [
        {
          cpu: 0.5,
          memory: "64Mi",
        },
        {
          cpu: 1,
          memory: "128Mi",
        },
      ],
    },
  },
  {
    title:
      "with avoidOutOfpods, multiple containers and initcontainers, no requests",
    options: {
      avoidOutOfpods: true,
      nodeConfig: {
        cpu: "7820m",
        memory: "24505448Ki",
      },
    },
    manifests: [
      {
        kind: "Deployment",
        metadata: {
          annotations: {},
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: "container1",
                  resources: { requests: {} },
                },
                {
                  name: "container2",
                  resources: { requests: {} },
                },
              ],
              initContainers: [
                {
                  name: "initcontainer1",
                  resources: { requests: {} },
                },
                {
                  name: "initcontainer2",
                  resources: { requests: {} },
                },
              ],
            },
          },
        },
      },
    ],
    expected: {
      containers: [
        {
          cpu: "0.036",
          memory: "109Mi",
        },
        {
          cpu: "0.036",
          memory: "109Mi",
        },
      ],
      initContainers: [
        {
          cpu: "0",
          memory: "0",
        },
        {
          cpu: "0",
          memory: "0",
        },
      ],
    },
  },
  {
    title:
      "avoidOutOfpods: with minimize-dev-resources-requests-disable annotation",
    options: {
      avoidOutOfpods: true,
      nodeConfig: {
        cpu: "7820m",
        memory: "24505448Ki",
      },
    },
    manifests: [
      {
        kind: "Deployment",
        metadata: {
          annotations: {
            "patches.kontinuous/minimize-dev-resources-requests-disable": true,
          },
        },
        spec: {
          template: {
            spec: {
              containers: [
                {
                  name: "container1",
                  resources: { requests: { cpu: 0.5, memory: "64Mi" } },
                },
                {
                  name: "container2",
                  resources: { requests: { cpu: 1, memory: "128Mi" } },
                },
              ],
              initContainers: [
                {
                  name: "initcontainer1",
                  resources: { requests: { cpu: 0.5, memory: "64Mi" } },
                },
                {
                  name: "initcontainer2",
                  resources: { requests: { cpu: 1, memory: "128Mi" } },
                },
              ],
            },
          },
        },
      },
    ],
    expected: {
      containers: [
        {
          cpu: 0.5,
          memory: "64Mi",
        },
        {
          cpu: 1,
          memory: "128Mi",
        },
      ],
      initContainers: [
        {
          cpu: 0.5,
          memory: "64Mi",
        },
        {
          cpu: 1,
          memory: "128Mi",
        },
      ],
    },
  },
]

samples.forEach((sample) => {
  test(`${sample.title}`, async () => {
    const ctx = require("~common/ctx")

    const res = defaultMinRequests(sample.manifests, sample.options, {
      config: { environment: "dev" },
      ctx,
      logger: {
        trace: () => {},
      },
    })
    expect(
      res[0].spec.template.spec.containers.map(
        (container) => container.resources.requests
      )
    ).toEqual(sample.expected.containers)

    if (sample.expected.initContainers) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(
        res[0].spec.template.spec.initContainers.map(
          (container) => container.resources.requests
        )
      ).toEqual(sample.expected.initContainers)
    }
  })
})
