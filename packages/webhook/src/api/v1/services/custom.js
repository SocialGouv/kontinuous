const envKubecontext = require("~common/utils/env-kubecontext")
const yaml = require("~common/utils/yaml")

module.exports =
  ({ services }) =>
  async ({ env, hash, manifests, repositoryUrl }) => {
    const sanitizedManifests = yaml.dump(yaml.load(manifests)) // protect against injections
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

    const kubecontext = envKubecontext(env)

    return services.pipeline({
      eventName: "custom",
      env,
      kubecontext,
      ref: hash,
      after: null,
      repositoryUrl,
      args: ["deploy", "-f", "/workspace/manifests.yaml"],
      checkout: false,
      initContainers,
    })
  }
