import ParsedUrl from "parse-url";

type AdditionalInfos = {
  host: string;
  repository: string;
  owner: string;
  name: string;
  repo: string;
  href: string;
  branch: string;
  blob: string;
  path: string;
  filepath: string;
};
type GitHubUrl = Partial<ReturnType<typeof ParsedUrl> & AdditionalInfos>;

type ParseGithubUrl = (string) => GitHubUrl;
