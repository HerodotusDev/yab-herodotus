import { env } from "bun";
import { JsonRpcProvider } from "ethers";
import { getSlots } from "../steps/01-get-slots";
import config from "../config.json";
import { expect, test } from "bun:test";
import { blockNumber } from "..";

const {
  yabContractAddress,
  testTransaction: {
    input: { dstAddress, amount },
  },
} = config;

/**
 * This test double checks if we calculated the slots correctly
 * We use the eth_getStorageAt RPC call and do this by mapping the slot numbers to the slot values
 * and checking if they match with the expected values that we know are true .
 */
test("Storage slots are valid", async () => {
  const rpcUrl = env.GOERLI_RPC_URL;
  const rpc = new JsonRpcProvider(rpcUrl);
  const { destAddressSlot, amountSlot } = getSlots();

  // Mapping holding the slots to the values that we know are correct because we checked them in the example transaction's inputs
  let slotsToCorrectValues = {
    [destAddressSlot]: dstAddress,
    [amountSlot]: amount,
  };

  // We check that each slot holds its correct value
  for (const [slot, correctValue] of Object.entries(slotsToCorrectValues)) {
    // We use the eth_getStorageAt RPC call to get the value of a slot
    let slotValue = await rpc.send("eth_getStorageAt", [
      yabContractAddress,
      slot,
      blockNumber,
    ]);

    expect(slotValue).toBe(correctValue);
  }
});
