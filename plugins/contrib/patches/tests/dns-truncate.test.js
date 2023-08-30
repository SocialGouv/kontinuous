const dnsTruncate = require("../03-dns-truncate")

const samples = [
  {
    title: "should strip invalid DNS chars",
    options: {},
    manifests: [
      {
        kind: "Ingress",
        spec: { rules: [{ host: "some-host.something.com" }] },
      },
      {
        kind: "Ingress",
        spec: { rules: [{ host: "something-else-some-host.com" }] },
      },
      {
        kind: "Ingress",
        spec: { rules: [{ host: "something.something.some.where.fr" }] },
      },
    ],
    expected: [
      "some-host.something.com",
      "something-else-some-host.com",
      "something.something.some.where.fr",
    ],
  },
  {
    title: "should cut long DNS",
    options: {},
    manifests: [
      {
        kind: "Ingress",
        spec: {
          rules: [
            {
              host: "there-are-no-big-problems-there-are-just-a-lot-of-little-problems.something.somewhere.around.com",
            },
          ],
        },
      },
      {
        kind: "Ingress",
        spec: {
          rules: [
            {
              host: "perfection-is-achieved-not-when-there-is-nothing-more-to-add-but-when-there-is-nothing-left-to-take-away.something.somewhere.around.com",
            },
          ],
        },
      },
    ],
    expected: [
      "there-are-no-big-problems-there-are-just-a-lot-of-lit-fjdkhln2.something.somewhere.around.com",
      "perfection-is-achieved-not-when-there-is-nothing-more-p4f2qo44.something.somewhere.around.com",
    ],
  },
]

samples.forEach((sample) => {
  test(`${sample.title}`, async () => {
    const ctx = require("~common/ctx")
    const utils = require("~common/utils")

    const res = dnsTruncate(sample.manifests, sample.options, {
      config: { environment: "dev" },
      ctx,
      utils,
      logger: {
        trace: () => {},
      },
    })

    const hosts = res
      .filter((k) => k.kind === "Ingress")
      .flatMap((ing) => ing.spec.rules.map((rule) => rule.host))

    expect(hosts).toEqual(sample.expected)
  })
})
