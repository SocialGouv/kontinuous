module.exports = {
  common: {
    paths: ["./"],
    recursive: true,
    silent: false,
    exclude: "*.md,node_modules",
  },
  targets: [
    {
      regex: "SocialGouv/kontinuous(.*)(:|@)([a-zA-Z0-9-]+)",
      replacementFactory: (version) => `SocialGouv/kontinuous$1$2${version}`,
    },
    {
      regex: "socialgouv/kontinuous(.*)(:|@)([a-zA-Z0-9-]+)",
      replacementFactory: (version) => `socialgouv/kontinuous$1$2${version}`,
    },
  ],
}
