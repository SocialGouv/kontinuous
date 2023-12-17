import { IObjectMeta } from "@kubernetes-models/apimachinery/apis/meta/v1/ObjectMeta";

type Values = Record<string, any> & {
  global: {
    env: {
      preprod: boolean;
      prod: boolean;
      dev: boolean;
    };
    host: string;
    repositoryName: string;
    ingress: {
      annotations?: IObjectMeta["annotations"];
    };
  };
};

type Params = {
  config: any;
  utils: Kontinuous.Utils;
  ctx: any;
};

const maildev = async (
  values: Values,
  options,
  { config, utils, ctx }: Params
) => {
  console.log("maildev", values);
  return values;
  /*
  TODO:
   - pb tpl
*/

  Object.entries(values.project.fabrique.contrib).forEach(
    ([key, component]: [string, any]) => {
      if (component[`~chart`] === "project.fabrique.contrib.maildev") {
        const persistenceEnabled =
          component.persistence.enabled !== null
            ? component.persistence.enabled
            : !!values.global.env.preprod;

        component.maildev = {
          ...component.maildev,
          host: component.host || `${key}-${values.global.host}`,
          repositoryName: values.global.repositoryName,
          ingress: {
            ...(component.ingress || {}),
            annotations: values.global.ingress.annotations,
          },
          persistence: {
            enabled: persistenceEnabled,
          },
          cron: {
            enabled: persistenceEnabled,
          },
        };
      }
    }
  );
};

//@ts-ignore
module.exports = maildev;
