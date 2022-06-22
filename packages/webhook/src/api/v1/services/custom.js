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
      env,
      kubecontext: env === "prod" ? "prod" : "dev",
      ref: hash,
      after: null,
      repositoryUrl,
      args: ["deploy", "-f", "/workspace/manifests.yaml"],
      checkout: false,
      initContainers,
    })
  }
