const yaml = require("~common/utils/yaml")

module.exports =
  ({ services }) =>
  async ({ cluster, env, hash, manifests, repositoryUrl }) => {
    const sanitizedManifests = yaml.dump(yaml.loadAll(manifests)) // protect against injections
    const initContainers = [
      {
        name: "write-custom-manifest",
        image: "debian:stable",
        command: [
          "sh",
          "-c",
          `
cat <<'EOF' > /workspace/manifests.yaml
${sanitizedManifests}
EOF
`,
        ],
        volumeMounts: [
          {
            name: "workspace",
            mountPath: "/workspace",
          },
        ],
      },
    ]

    return services.pipeline({
      eventName: "custom",
      env,
      cluster,
      ref: hash,
      after: null,
      repositoryUrl,
      args: ["deploy", "-f", "/workspace/manifests.yaml"],
      checkout: false,
      initContainers,
    })
  }
