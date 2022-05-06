import {AbortSignal} from "@chainsafe/abort-controller";
import {bellatrix} from "@chainsafe/lodestar-types";
import {fromHex} from "@chainsafe/lodestar-utils";

import {JsonRpcHttpClient} from "../eth1/provider/jsonRpcHttpClient";
import {bytesToData, numToQuantity, DATA, QUANTITY} from "../eth1/provider/utils";
import {IJsonRpcHttpClient} from "../eth1/provider/jsonRpcHttpClient";
import {IExecutionBuilder} from "./interface";

export type ExecutionBuilderHttpOpts = {
  enabled: boolean;
  urls: string[];
  timeout?: number;
  jwtSecretHex?: string;
};

export const defaultExecutionBuilderHttpOpts: ExecutionBuilderHttpOpts = {
  enabled: false,
  urls: ["http://localhost:8661"],
  timeout: 12000,
};

export class ExecutionBuilderHttp implements IExecutionBuilder {
  private readonly rpc: IJsonRpcHttpClient;

  constructor(opts: ExecutionBuilderHttpOpts, signal: AbortSignal, rpc?: IJsonRpcHttpClient) {
    this.rpc =
      rpc ??
      new JsonRpcHttpClient(opts.urls, {
        signal,
        timeout: opts.timeout,
        jwtSecret: opts.jwtSecretHex ? fromHex(opts.jwtSecretHex) : undefined,
      });
  }

  async registerValidator(validatorRegistation: bellatrix.SignedValidatorRegistrationV1): Promise<void> {
    const method = "builder_registerValidatorV1";
    const serializedValidatorReg = serializeValidatorRegistration(validatorRegistation.message);
    const response = await this.rpc.fetch<
      BuilderApiRpcReturnTypes[typeof method],
      BuilderApiRpcParamTypes[typeof method]
    >({
      method,
      params: [serializedValidatorReg, bytesToData(validatorRegistation.signature)],
    });
    if (response !== RegisterValidatorV1Status.OK) {
      throw Error("Validator registration failed");
    }
    return;
  }
}

/* eslint-disable @typescript-eslint/naming-convention */

type BuilderApiRpcParamTypes = {
  builder_registerValidatorV1: [message: ApiValidatorRegistrationV1, signature: DATA];
};

enum RegisterValidatorV1Status {
  OK = "OK",
}

type BuilderApiRpcReturnTypes = {
  builder_registerValidatorV1: RegisterValidatorV1Status | null;
};

type ApiValidatorRegistrationV1 = {
  feeRecipient: DATA;
  gasLimit: QUANTITY;
  timestamp: QUANTITY;
  pubkey: DATA;
};

export function serializeValidatorRegistration(data: bellatrix.ValidatorRegistrationV1): ApiValidatorRegistrationV1 {
  return {
    feeRecipient: bytesToData(data.feeRecipient),
    gasLimit: numToQuantity(data.gasLimit),
    timestamp: numToQuantity(data.timestamp),
    pubkey: bytesToData(data.pubkey),
  };
}
