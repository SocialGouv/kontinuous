import { ObjectMeta } from "@kubernetes-models/apimachinery/apis/meta/v1/ObjectMeta";
import type { MailDevSchema } from "./09-maildev-schema";
//export * from "./09-maildev-schema";

export type ValuesPlugin = Record<string, any>;

type Course = "Computer Science" | "Mathematics" | "Literature";

interface CourseInfo {
  professor: string;
  cfu: number;
}

// todo: export as JSON schema for values.yaml completion
export type MailDevComponent = {
  persistence: { enabled: boolean };
  host: string;
  ingress: {
    annotations: ObjectMeta["annotations"]; // TODO:  import chart from json-schemas nginx schema
  };
  ["~chart"]: string;
  maildev: MailDevSchema; // todo: import chart from helm-charts schema
};

export type MailDevValues = {
  global: {
    env: {
      preprod: boolean;
      prod: boolean;
      dev: boolean;
    };
    host: string;
    repositoryName: string;
    ingress: {
      // todo: use https://github.com/SocialGouv/json-schemas/blob/main/nginx/annotations.schema.json
      // needs npm publication
      annotations: ObjectMeta["annotations"];
    };
  };
  project: ValuesPlugin;
};

export type MailDevParams = {
  config: any;
  utils: keyof Kontinuous.Utils;
  ctx: any;
};
