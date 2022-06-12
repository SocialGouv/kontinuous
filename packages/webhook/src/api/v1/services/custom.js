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

    return services.pipeline({
      eventName: "custom",
      kubecontext: env,
      ref: hash,
      after: null,
      repositoryUrl,
      args: ["deploy"],
      checkout: false,
      initContainers,
    })
  }
