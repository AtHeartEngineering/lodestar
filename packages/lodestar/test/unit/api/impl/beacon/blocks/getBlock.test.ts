import sinon from "sinon";
import * as blockUtils from "../../../../../../src/api/impl/beacon/blocks/utils.js";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {generateEmptySignedBlock} from "../../../../../utils/block.js";
import {setupApiImplTestServer, ApiImplTestModules} from "../../index.test";
import {SinonStubFn} from "../../../../../utils/types.js";

use(chaiAsPromised);

// TODO remove stub
describe.skip("api - beacon - getBlock", function () {
  let resolveBlockIdStub: SinonStubFn<typeof blockUtils["resolveBlockId"]>;
  let server: ApiImplTestModules;

  before(function () {
    server = setupApiImplTestServer();
    resolveBlockIdStub = server.sandbox.stub(blockUtils, "resolveBlockId");
  });

  after(function () {
    server.sandbox.restore();
  });

  it("invalid block id", async function () {
    resolveBlockIdStub.withArgs(sinon.match.any, sinon.match.any, "abc").throwsException();
    await expect(server.blockApi.getBlock("abc")).to.eventually.be.rejected;
  });

  it("success for non finalized block", async function () {
    resolveBlockIdStub.withArgs(sinon.match.any, sinon.match.any, "head").resolves(generateEmptySignedBlock());
    const {data: result} = await server.blockApi.getBlock("head");
    expect(result).to.not.be.null;
  });
});
