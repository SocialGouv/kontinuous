const yaml = require("~common/utils/yaml")

module.exports =
  ({ services }) =>
  async ({
    cluster,
    env,
    hash,
    manifests,
    deployConfig,
    repositoryUrl,
    kontinuousVersion,
    mountKubeconfig,
    serviceAccountName,
    mountSecrets,
  }) => {
    const sanitizedManifests = yaml.dumpAll(yaml.loadAll(manifests)) // protect against injections
    const sanitizedConfig = yaml.dumpAll(yaml.loadAll(deployConfig)) // protect against injections
    const initContainers = [
      {
        name: "write-custom-manifest",
        image: "debian:stable",
        command: [
          "sh",
          "-c",
          `
cd /workspace
cat <<'EOF' > manifests.yaml
${sanitizedManifests}
EOF
mkdir -p .kontinuous
cat <<'EOF' > .kontinuous/config.yaml
${sanitizedConfig}
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
      args: ["deploy", "-f", "manifests.yaml"],
      checkout: false,
      initContainers,
      kontinuousVersion,
      mountKubeconfig,
      serviceAccountName,
      mountSecrets,
    })
  }
