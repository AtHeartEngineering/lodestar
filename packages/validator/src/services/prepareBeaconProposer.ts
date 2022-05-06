import {ValidatorIndex, ExecutionAddress, BLSSignature, Slot, UintNum64} from "@chainsafe/lodestar-types";
import {Api} from "@chainsafe/lodestar-api";
import {IBeaconConfig} from "@chainsafe/lodestar-config";
import {fromHexString} from "@chainsafe/ssz";

import {ValidatorStore} from "./validatorStore";
import {IndicesService} from "./indices";
import {IClock, ILoggerVc} from "../util";
import {Metrics} from "../metrics";

type ProposerPreparationData = {
  validatorIndex: ValidatorIndex;
  feeRecipient: ExecutionAddress;
  validatorRegistration: {
    timestamp: UintNum64;
    gasLimit: UintNum64;
    signature: BLSSignature;
  };
};

/**
 * This service is responsible for updating the BNs and/or Mev relays with
 * the corresponding feeRecipient suggestion. This should ideally run per epoch
 * but can be run per slot. Lighthouse also uses this to trigger any block
 */
export class PrepareBeaconProposerService {
  constructor(
    private readonly config: IBeaconConfig,
    private readonly logger: ILoggerVc,
    private readonly api: Api,
    private clock: IClock,
    private readonly validatorStore: ValidatorStore,
    private readonly defaultSuggestedFeeRecipient: ExecutionAddress,
    private readonly indicesService: IndicesService,
    private readonly metrics: Metrics | null
  ) {
    clock.runEverySlot(this.prepareBeaconProposer);
  }

  private prepareBeaconProposer = async (slot: Slot): Promise<void> => {
    await Promise.all([
      // Run prepareBeaconProposer immediately for all known local indices
      this.getProposerData(slot, this.indicesService.getAllLocalIndices())
        .then((proposerData) => this.api.validator.prepareBeaconProposer(proposerData))
        .catch((e: Error) => {
          this.logger.error("Error on prepareBeaconProposer", {slot}, e);
        }),

      // At the same time fetch any remaining unknown validator indices, then poll duties for those newIndices only
      this.indicesService
        .pollValidatorIndices()
        .then((newIndices) => this.getProposerData(slot, newIndices))
        .then((proposerData) => this.api.validator.prepareBeaconProposer(proposerData))
        .catch((e: Error) => {
          this.logger.error("Error on poll indices and prepareBeaconProposer", {slot}, e);
        }),
    ]);
  };

  private getProposerData = async (slot: Slot, indices: number[]): Promise<ProposerPreparationData[]> => {
    const proposerData: ProposerPreparationData[] = [];
    for (const validatorIndex of indices) {
      const pubkeyHex = this.indicesService.index2pubkey.get(validatorIndex);
      if (!pubkeyHex) throw Error(`Pubkey lookup failure for validatorIndex=${validatorIndex}`);
      const feeRecipient = this.defaultSuggestedFeeRecipient;
      const gasLimit = 10000;
      const signedValidatorRegistration = await this.validatorStore.signValidatorRegistration(
        fromHexString(pubkeyHex),
        feeRecipient,
        gasLimit,
        slot
      );
      const validatorRegistration = {
        timestamp: signedValidatorRegistration.message.timestamp,
        gasLimit,
        signature: signedValidatorRegistration.signature,
      };
      proposerData.push({validatorIndex, feeRecipient, validatorRegistration});
    }
    return proposerData;
  };
}
