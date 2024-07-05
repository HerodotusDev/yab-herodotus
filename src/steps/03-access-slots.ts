import { getSlots } from "./01-get-slots";
import config from "../config.json";
import { Contract, RpcProvider } from "starknet";
import { env } from "bun";
import { assert } from "ethers";

// For this final step we need our contract address, and the transaction we use as example.
const {
  yabContractAddress,
  testTransaction: {
    input: { dstAddress, chainId, value },
  },
} = config;

/**
 * To access the data proven by Herodotus you need to use our contract on-chain that is responsible for this.
 * This contract is called `Facts Registry` you can see the source code here:
 * Use this page to see our most up to date deployments: https://herodotus.notion.site/8514ae5a125b4d4992fb6bd23c37c745?v=3166dbaeb11645e2a20d6fb348002922
 *
 * I made it easier and put the Facts Registry contract address here:
 * https://sepolia.starkscan.co/contract/0x07d3550237ecf2d6ddef9b78e59b38647ee511467fe000ce276f245a006b40bc
 *
 * Also, the source code for this contract is available here: https://github.com/HerodotusDev/herodotus-on-starknet/
 */
const herodotusFactsRegistryContractAddress =
  "0x07d3550237ecf2d6ddef9b78e59b38647ee511467fe000ce276f245a006b40bc";

/**
 * In this step we will access the proven data that is available on-chain!
 *
 * There are two major ways of doing this:
 *  - on-chain
 *  - off-chain
 *
 * We will be now exploring an example of how to do it off-chain, however doing it on-chain is also very similar.
 *
 * The main steps are:
 *  - get the facts registry contract
 *  - figure out it's interface
 *  - call the function you need
 *
 * The thing that is different is the execution and mainly last step
 *  - off-chain - you call the contract through an RPC, get the results off-chain and do something with it, in our example we will focus on the `get_slot_value` function but there are more depending on what you're proving
 *  - on-chain - you call the contract directly from your own contract and do something with the response
 *
 * As for what to do with something once you get it, this is entirely up to you and your idea.
 *
 * For this we again need:
 * @param slots - the slots that we want to access
 * @param blockNumber - the blocknumber that we want to prove the data in
 */
export async function accessSlots(
  slots: ReturnType<typeof getSlots>,
  blockNumber: number
) {
  // We start off by initialising an RPC provider for starknet - our destination chain
  const provider = new RpcProvider({ nodeUrl: env.SN_SEPOLIA_RPC_URL });

  // We get the abi of the contract - the interface of the contract
  const { abi } = await provider.getClassAt(
    herodotusFactsRegistryContractAddress
  );
  if (abi === undefined) throw new Error("no abi.");

  // We initialise the contract class provided by starknet js
  const contract = new Contract(
    abi,
    herodotusFactsRegistryContractAddress,
    provider
  );

  // This mapping keeps the correct values of the slots - we know these from the example transaction inputs that we've gotten at step 1
  let slotsToCorrectValues = {
    [slots.destAddressSlot]: dstAddress,
    [slots.amountSlot]: value,
  };
  const chainIdAsNumber = Number(BigInt(chainId));

  // Let's map through the correct values and see if they match what we've proven on-chain
  for (const [slot, correctValue] of Object.entries(slotsToCorrectValues)) {
    // We use the get_slot_value method on the Facts Registry contract to get the value of a slot that was proven by Herodotus, this slot would not exist on the Facts Registry if we haven't proven it in step 2!
    let slotValue = await contract.get_slot_value(
      yabContractAddress,
      blockNumber,
      slot
    );
    // The slotValue needs formatting, let's make it into a hex string
    slotValue = "0x" + slotValue.Some.toString(16).padStart(64, "0");
    // and print out what we got here
    console.log("[ACCESS SLOTS]", { slotValue, correctValue });

    // Finally let's double check if the proven data is the same as what we know is true!
    assert(
      slotValue === correctValue,
      `Slot value is not correct, ${slotValue} !== ${correctValue}`,
      "VALUE_MISMATCH"
    );
  }

  // Special treatment for the isUsedAndChainIdSlot
  let slotValue = await contract.get_slot_value(
    yabContractAddress,
    blockNumber,
    slots.isUsedAndChainIdSlot
  );
  // The slotValue needs formatting, let's make it into a hex string
  slotValue = "0x" + slotValue.Some.toString(16).padStart(64, "0");

  // We start of by converting the slot value to a BigInt
  const slotValueBigInt = BigInt(slotValue);
  // Then we get the least significant byte of the slot value and check if it is equal to one - this will give us the boolean isUsed
  const isUsedValue = (slotValueBigInt & 0xffn) === 1n;
  console.log("[ACCESS SLOTS]", { isUsedValue, correctValue: true });

  // Then we skip the least significant byte we just read, get the next least significant byte and convert it to a number
  const chainIdValue = Number((slotValueBigInt >> 8n) & 0xffn);
  console.log("[ACCESS SLOTS]", {
    chainIdValue,
    correctValue: chainIdAsNumber,
  });

  // Finally let's double check if the proven data is the same as what we know is true!
  assert(
    isUsedValue === true,
    `Slot value is not correct, ${isUsedValue} !== ${true}`,
    "VALUE_MISMATCH"
  );
  assert(
    chainIdValue === chainIdAsNumber,
    `Slot value is not correct, ${chainIdValue} !== ${chainIdAsNumber}`,
    "VALUE_MISMATCH"
  );

  // This is it! To sum up, we have:
  //  - analysed the contract we wanted to get the storage proofs from
  //  - we got the storage slots
  //  - we asked Herodotus Storage Proof API to prove the slots
  //  - and finally we accessed the proven data on the destination chain.

  // From here it's up to your own imagination!
  // Have fun building with Storage Proofs!
}

//? Run this to test it out:
// bun start
