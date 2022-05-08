/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import {AbortSignal} from "@chainsafe/abort-controller";
import {allForks} from "@chainsafe/lodestar-types";
import {ChainEvent} from "../emitter";
import {JobItemQueue} from "../../util/queue";
import {BlockError, BlockErrorCode, ChainSegmentError} from "../errors";
import {verifyBlocks, VerifyBlockModules} from "./verifyBlock";
import {importBlock, ImportBlockModules} from "./importBlock";
import {assertLinearChainSegment} from "./utils/chainSegment";
import {BlockProcessOpts} from "../options";
import {PartiallyVerifiedBlock} from "./types";
export {PartiallyVerifiedBlockFlags} from "./types";

const QUEUE_MAX_LENGHT = 256;

export type ProcessBlockModules = VerifyBlockModules & ImportBlockModules;

/**
 * BlockProcessor processes block jobs in a queued fashion, one after the other.
 */
export class BlockProcessor {
  readonly jobQueue: JobItemQueue<[PartiallyVerifiedBlock[] | PartiallyVerifiedBlock], void>;

  constructor(modules: ProcessBlockModules, opts: BlockProcessOpts, signal: AbortSignal) {
    this.jobQueue = new JobItemQueue(
      (job) => {
        if (!Array.isArray(job)) {
          return processBlock(modules, job, opts);
        } else {
          return processChainSegment(modules, job, opts);
        }
      },
      {maxLength: QUEUE_MAX_LENGHT, signal},
      modules.metrics ? modules.metrics.blockProcessorQueue : undefined
    );
  }

  async processBlockJob(job: PartiallyVerifiedBlock): Promise<void> {
    await this.jobQueue.push(job);
  }

  async processChainSegment(job: PartiallyVerifiedBlock[]): Promise<void> {
    await this.jobQueue.push(job);
  }
}

///////////////////////////
// TODO: Run this functions with spec tests of many blocks
///////////////////////////

/**
 * Validate and process a block
 *
 * The only effects of running this are:
 * - forkChoice update, in the case of a valid block
 * - various events emitted: checkpoint, forkChoice:*, head, block, error:block
 * - (state cache update, from state regeneration)
 *
 * All other effects are provided by downstream event handlers
 */
export async function processBlock(
  modules: ProcessBlockModules,
  partiallyVerifiedBlock: PartiallyVerifiedBlock,
  opts: BlockProcessOpts
): Promise<void> {
  await processChainSegment(modules, [partiallyVerifiedBlock], opts);
}

/**
 * Similar to processBlockJob but this process a chain segment
 */
export async function processChainSegment(
  modules: ProcessBlockModules,
  partiallyVerifiedBlocks: PartiallyVerifiedBlock[],
  opts: BlockProcessOpts
): Promise<void> {
  if (partiallyVerifiedBlocks.length === 0) {
    return; // TODO: or throw?
  } else if (partiallyVerifiedBlocks.length > 1) {
    assertLinearChainSegment(
      modules.config,
      partiallyVerifiedBlocks.map((b) => b.block)
    );
  }

  // TODO: Does this makes sense with current batch verify approach?
  //       No block is imported until all blocks are verified
  const importedBlocks = 0;

  try {
    const fullyVerifiedBlocks = await verifyBlocks(modules, partiallyVerifiedBlocks, opts);

    for (const fullyVerifiedBlock of fullyVerifiedBlocks) {
      // No need to sleep(0) here since `importBlock` includes a disk write
      // TODO: Consider batching importBlock too if it takes significant time
      await importBlock(modules, fullyVerifiedBlock);
    }
  } catch (e) {
    // above functions should only throw BlockError
    const err = getBlockError(e, partiallyVerifiedBlocks[0].block);

    modules.emitter.emit(ChainEvent.errorBlock, err);

    // Convert to ChainSegmentError to append `importedBlocks` data
    const chainSegmentError = new ChainSegmentError(partiallyVerifiedBlocks[0].block, err.type, importedBlocks);
    chainSegmentError.stack = err.stack;
    throw chainSegmentError;
  }
}

function getBlockError(e: unknown, block: allForks.SignedBeaconBlock): BlockError {
  if (e instanceof BlockError) {
    return e;
  } else if (e instanceof Error) {
    const blockError = new BlockError(block, {code: BlockErrorCode.BEACON_CHAIN_ERROR, error: e as Error});
    blockError.stack = e.stack;
    return blockError;
  } else {
    return new BlockError(block, {code: BlockErrorCode.BEACON_CHAIN_ERROR, error: e as Error});
  }
}
