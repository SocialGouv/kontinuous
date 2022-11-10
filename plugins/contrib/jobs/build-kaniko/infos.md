Why moving soon to buildkit:

- kaniko doesn't support multistage
  https://github.com/GoogleContainerTools/kaniko/issues/1548
- not well maintained, check issues on the project some minutes and you'll see
- Google’s Kaniko is not recommended, it does not have good support for cache reuse, and the community is not active.
  https://www.sobyte.net/post/2022-01/expirence-of-argo-workflow/
- there is cases where the build behavior is not similar, where docker build succefull but kaniko doesn't (observed many times, especially on --chown instructions)
- when docker buildkit with default options take less than 1GB, kaniko with default options take 9GB of RAM to build an image, and with tunned options take 2GB