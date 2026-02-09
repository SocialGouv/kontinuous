const persistPatterns = [
  "**/persist",
  "persist/**",
  "**/persist/**",

  "persist-**",
  "**-persist",
  "**-persist-**",

  "**/persist-**/**",
  "**/**-persist/**",
  "**/**-persist-**/**",

  "main",
  "master",
  "dev",
  "develop",
  "preprod",

  "alpha",
  "beta",
  "next",
]
module.exports = {
  persistPatterns,
}
