import { env } from "bun";
import { JsonRpcProvider } from "ethers";
import { getSlots } from "../steps/01-get-slots";
import config from "../config.json";
import { expect, test } from "bun:test";

const {
  yabContractAddress,
  blockNumber,
  testTransaction: {
    input: { dstAddress, chainId, value },
  },
} = config;

/**
 * This test double checks if we calculated the slots correctly
 * We use the eth_getStorageAt RPC call and do this by mapping the slot numbers to the slot values
 * and checking if they match with the expected values that we know are true .
 */
test("Storage slots are valid", async () => {
  const rpcUrl = env.SEPOLIA_RPC_URL;
  const rpc = new JsonRpcProvider(rpcUrl);
  const { destAddressSlot, amountSlot, isUsedAndChainIdSlot } = getSlots();
  const hexBlockNumber = "0x" + blockNumber.toString(16);

  // Mapping holding the slots to the values that we know are correct because we checked them in the example transaction's inputs
  let slotsToCorrectValues = {
    [destAddressSlot]: dstAddress,
    [amountSlot]: value,
  };

  // We check that each slot holds its correct value
  for (const [slot, correctValue] of Object.entries(slotsToCorrectValues)) {
    // We use the eth_getStorageAt RPC call to get the value of a slot
    let slotValue = await rpc.send("eth_getStorageAt", [
      yabContractAddress,
      slot,
      hexBlockNumber,
    ]);

    expect(slotValue).toBe(correctValue);
  }

  // Special treatment for the isUsedAndChainIdSlot
  let slotValue = await rpc.send("eth_getStorageAt", [
    yabContractAddress,
    isUsedAndChainIdSlot,
    hexBlockNumber,
  ]);

  // We start of by converting the slot value to a BigInt
  const slotValueBigInt = BigInt(slotValue);
  // Then we get the least significant byte of the slot value and check if it is equal to one - this will give us the boolean isUsed
  const isUsedValue = (slotValueBigInt & 0xffn) === 1n;
  // we validate the isUsed value - it should be true - see the code of the transfer function in YAB's PaymentRegistry.sol
  expect(isUsedValue).toBe(true);
  // Then we skip the least significant byte we just read, get the next least significant byte and convert it to a number
  const chainIdValue = Number((slotValueBigInt >> 8n) & 0xffn);
  // We validate that the chain id is equal to the one we provided
  expect(chainIdValue).toBe(Number(BigInt(chainId)));
});
