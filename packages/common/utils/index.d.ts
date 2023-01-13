// import JSDoc definitions
type Slug = typeof import("./slug");
type KindIsRunnable = typeof import("./kind-is-runnable");
type AsyncShell = typeof import("./async-shell");
type IsVersionTag = typeof import("./is-version-tag");
type SanitizeLabel = typeof import("./sanitize-label");
type IgnoreYarnState = typeof import("./ignore-yarn-state");
type PatternMatch = typeof import("./pattern-match");
type KubectlRetry = typeof import("./kubectl-retry");

// TODO : fetch from ./*.js
// for some reason the description from source JSDoc isnt displayed
interface Utils {
  /** execute some async shell command */
  asyncShell: AsyncShell;
  /** Return slugified, hostname-friendly string */
  slug: Slug;
  /** Check if some branch is valid semantic-release tag: vx.y.z */
  isVersionTag: IsVersionTag;
  /** exclude non-alphanums chars */
  sanitizeLabel: SanitizeLabel;
  //@ts-ignore
  yaml;
  //@ts-ignore
  logger;
  //@ts-ignore
  KontinuousPluginError;
  //@ts-ignore
  patternMatch: PatternMatch;
  // check if the manifest is "runnable" in kubernetes
  // act as a typeguard
  kindIsRunnable: KindIsRunnable;
  /** Run kubectl with exponential backoff */
  kubectlRetry: KubectlRetry;
  //@ts-ignore
  needKubectl;
  /** check if some path should be ignored */
  ignoreYarnState: IgnoreYarnState;
}

export { Utils };
