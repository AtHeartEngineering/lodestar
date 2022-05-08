import {allForks, altair} from "@chainsafe/lodestar-types";
import {computeEpochAtSlot, ISignatureSet} from "../../util";
import {CachedBeaconStateAllForks, CachedBeaconStateAltair} from "../../types";
import {getProposerSlashingsSignatureSets} from "./proposerSlashings";
import {getAttesterSlashingsSignatureSets} from "./attesterSlashings";
import {getAttestationsSignatureSets} from "./indexedAttestation";
import {getProposerSignatureSet} from "./proposer";
import {getRandaoRevealSignatureSet} from "./randao";
import {getVoluntaryExitsSignatureSets} from "./voluntaryExits";
import {getSyncCommitteeSignatureSet} from "../../altair/block/processSyncCommittee";

export * from "./attesterSlashings";
export * from "./indexedAttestation";
export * from "./proposer";
export * from "./proposerSlashings";
export * from "./randao";
export * from "./voluntaryExits";

/**
 * Includes all signatures on the block (except the deposit signatures) for verification.
 * Deposits are not included because they can legally have invalid signatures.
 */
export function getBlockSignatureSets(
  state: CachedBeaconStateAllForks,
  signedBlock: allForks.SignedBeaconBlock,
  opts?: {
    /** Useful since block proposer signature is verified beforehand on gossip validation */
    skipProposerSignature?: boolean;
  }
): ISignatureSet[] {
  const signatureSets = [
    getRandaoRevealSignatureSet(state, signedBlock.message),
    ...getProposerSlashingsSignatureSets(state, signedBlock),
    ...getAttesterSlashingsSignatureSets(state, signedBlock),
    ...getAttestationsSignatureSets(state, signedBlock),
    ...getVoluntaryExitsSignatureSets(state, signedBlock),
  ];

  if (!opts?.skipProposerSignature) {
    signatureSets.push(getProposerSignatureSet(state, signedBlock));
  }

  // Only after altair fork, validate tSyncCommitteeSignature
  if (computeEpochAtSlot(signedBlock.message.slot) >= state.config.ALTAIR_FORK_EPOCH) {
    const syncCommitteeSignatureSet = getSyncCommitteeSignatureSet(
      state as CachedBeaconStateAltair,
      (signedBlock as altair.SignedBeaconBlock).message
    );
    // There may be no participants in this syncCommitteeSignature, so it must not be validated
    if (syncCommitteeSignatureSet) {
      signatureSets.push(syncCommitteeSignatureSet);
    }
  }

  return signatureSets;
}
