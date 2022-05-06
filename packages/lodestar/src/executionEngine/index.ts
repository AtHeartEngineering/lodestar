import {AbortSignal} from "@chainsafe/abort-controller";
import {IExecutionEngine, IExecutionBuilder} from "./interface";
import {ExecutionEngineDisabled} from "./disabled";
import {
  ExecutionEngineHttp,
  ExecutionEngineHttpOpts,
  defaultExecutionEngineHttpOpts,
  defaultDefaultSuggestedFeeRecipient,
} from "./http";
import {ExecutionEngineMock, ExecutionEngineMockOpts} from "./mock";

import {ExecutionBuilderHttp, ExecutionBuilderHttpOpts, defaultExecutionBuilderHttpOpts} from "./builder";
export {
  IExecutionEngine,
  ExecutionEngineHttp,
  ExecutionEngineDisabled,
  ExecutionEngineMock,
  defaultDefaultSuggestedFeeRecipient,
  IExecutionBuilder,
  ExecutionBuilderHttp,
  defaultExecutionEngineHttpOpts,
};

export type ExecutionEngineOpts =
  | ({mode?: "http"} & ExecutionEngineHttpOpts)
  | ({mode: "mock"} & ExecutionEngineMockOpts)
  | {mode: "disabled"};

export const defaultExecutionEngineOpts: ExecutionEngineOpts = defaultExecutionEngineHttpOpts;

export type ExecutionBuilderOpts = {mode?: "http"} & ExecutionBuilderHttpOpts;
export const defaultExecutionBuilderOpts: ExecutionBuilderOpts = defaultExecutionBuilderHttpOpts;

export function initializeExecutionEngine(opts: ExecutionEngineOpts, signal: AbortSignal): IExecutionEngine {
  switch (opts.mode) {
    case "mock":
      return new ExecutionEngineMock(opts);
    case "disabled":
      return new ExecutionEngineDisabled();
    case "http":
    default:
      return new ExecutionEngineHttp(opts, signal);
  }
}

export function initializeExecutionBuilder(opts: ExecutionBuilderOpts, signal: AbortSignal): IExecutionBuilder {
  switch (opts.mode) {
    case "http":
    default:
      return new ExecutionBuilderHttp(opts, signal);
  }
}
