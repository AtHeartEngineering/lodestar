import {IExecutionEngine} from "./interface.js";

export class ExecutionEngineDisabled implements IExecutionEngine {
  async notifyNewPayload(): Promise<never> {
    throw Error("Execution engine disabled");
  }

  async notifyForkchoiceUpdate(): Promise<never> {
    throw Error("Execution engine disabled");
  }

  async getPayload(): Promise<never> {
    throw Error("Execution engine disabled");
  }
}
