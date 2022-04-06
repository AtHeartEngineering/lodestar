import {join} from "node:path";
import {allForks, altair, BeaconStateAllForks} from "@chainsafe/lodestar-beacon-state-transition";
import {describeDirectorySpecTest} from "@chainsafe/lodestar-spec-test-util";
import {bellatrix, ssz} from "@chainsafe/lodestar-types";
import {ACTIVE_PRESET, ForkName} from "@chainsafe/lodestar-params";
import {createCachedBeaconStateTest} from "../../utils/cachedBeaconState.js";
import {SPEC_TEST_LOCATION} from "../specTestVersioning.js";
import {IBaseSpecTest, shouldVerify} from "../type.js";
import {expectEqualBeaconState, inputTypeSszTreeViewDU} from "../util.js";
import {getConfig} from "./util.js";
import {generateBlocksSZZTypeMapping} from "./sanity.js";

/* eslint-disable @typescript-eslint/naming-convention */

export function finality(fork: ForkName): void {
  describeDirectorySpecTest<IFinalityTestCase, BeaconStateAllForks>(
    `${ACTIVE_PRESET}/${fork}/finality/finality`,
    join(SPEC_TEST_LOCATION, `/tests/${ACTIVE_PRESET}/${fork}/finality/finality/pyspec_tests`),
    (testcase) => {
      let state = createCachedBeaconStateTest(testcase.pre, getConfig(fork));
      const verify = shouldVerify(testcase);
      for (let i = 0; i < testcase.meta.blocks_count; i++) {
        const signedBlock = testcase[`blocks_${i}`] as bellatrix.SignedBeaconBlock;

        state = allForks.stateTransition(state, signedBlock, {
          verifyStateRoot: false,
          verifyProposer: verify,
          verifySignatures: verify,
        });
      }

      state.commit();
      return state;
    },
    {
      inputTypes: inputTypeSszTreeViewDU,
      sszTypes: {
        pre: ssz[fork].BeaconState,
        post: ssz[fork].BeaconState,
        ...generateBlocksSZZTypeMapping(fork, 200),
      },
      shouldError: (testCase) => !testCase.post,
      timeout: 10000,
      getExpected: (testCase) => testCase.post,
      expectFunc: (testCase, expected, actual) => {
        expectEqualBeaconState(fork, expected, actual);
      },
    }
  );
}

/**
 * `meta.yaml`
 * ```
 * {blocks_count: 16}
 * ```
 * https://github.com/ethereum/consensus-specs/blob/dev/tests/formats/finality/README.md
 */
interface IFinalityTestCase extends IBaseSpecTest {
  [k: string]: altair.SignedBeaconBlock | unknown | null | undefined;
  meta: {
    blocks_count: number;
    bls_setting: bigint;
  };
  pre: BeaconStateAllForks;
  post?: BeaconStateAllForks;
}
