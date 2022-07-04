const envKubecontext = require("~common/utils/env-kubecontext")

module.exports =
  ({ services }) =>
  async ({ env, hash, manifests, repositoryUrl }) => {
    const initContainers = [
      {
        name: "write-custom-manifest",
        image: "debian:stable",
        command: [
          "sh",
          "-c",
          `
cat <<'EOF' > /workspace/manifests.yaml
${manifests}
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
