import fs from "node:fs";
import {defaultOptions, IBeaconNodeOptions} from "@chainsafe/lodestar";
import {ICliCommandOptions, extractJwtHexSecret} from "../../util";

export type ExecutionBuilderArgs = {
  "builder.enabled": boolean;
  "builder.urls": string[];
  "builder.timeout": number;
  "builder.jwt-secret"?: string;
};

export function parseArgs(args: ExecutionBuilderArgs): IBeaconNodeOptions["executionBuilder"] {
  return {
    enabled: args["builder.enabled"],
    urls: args["builder.urls"],
    timeout: args["builder.timeout"],
    /**
     * jwtSecret is parsed as hex instead of bytes because the merge with defaults
     * in beaconOptions messes up the bytes array as as index => value object
     */
    jwtSecretHex: args["builder.jwt-secret"]
      ? extractJwtHexSecret(fs.readFileSync(args["builder.jwt-secret"], "utf-8").trim())
      : undefined,
  };
}

export const options: ICliCommandOptions<ExecutionBuilderArgs> = {
  "builder.enabled": {
    description: "Enable builder interface",
    type: "boolean",
    defaultDescription: `${
      defaultOptions.executionBuilder.mode === "http" ? defaultOptions.executionBuilder.enabled : false
    }`,
    group: "builder",
  },
  "builder.urls": {
    description: "Urls hosting the builder API",
    type: "array",
    defaultDescription:
      defaultOptions.executionBuilder.mode === "http" ? defaultOptions.executionBuilder.urls.join(" ") : "",
    group: "builder",
  },

  "builder.timeout": {
    description: "Timeout in miliseconds for builder API HTTP client",
    type: "number",
    defaultDescription:
      defaultOptions.executionBuilder.mode === "http" ? String(defaultOptions.executionBuilder.timeout) : "",
    group: "builder",
  },

  "builder.jwt-secret": {
    description:
      "File path to a shared hex-encoded jwt secret which will be used to generate and bundle HS256 encoded jwt tokens for authentication with the builder",
    type: "string",
    group: "builder",
  },
};
