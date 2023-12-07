import { env } from "bun";
import { JsonRpcProvider } from "ethers";
import { getSlots } from "../steps/01-get-slots";
import config from "../config.json";
import { expect, test } from "bun:test";

//? For more info about config, see `src/get-slots.ts`
const {
  yabContractAddress,
  testTransaction: {
    input: { dstAddress, amount },
  },
} = config;

test("Storage slots are valid", async () => {
  const rpcUrl = env.GOERLI_RPC_URL;
  const rpc = new JsonRpcProvider(rpcUrl);
  const { destAddressSlot, amountSlot } = getSlots();

  let slotsToCorrectValues = {
    [destAddressSlot]: dstAddress,
    [amountSlot]: amount,
  };

  for (const [slot, correctValue] of Object.entries(slotsToCorrectValues)) {
    let slotValue = await rpc.send("eth_getStorageAt", [
      yabContractAddress,
      slot,
      "latest",
    ]);

    expect(slotValue).toBe(correctValue);
  }
});
