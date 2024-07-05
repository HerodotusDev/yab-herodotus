import { getSlots } from "./01-get-slots";
import config from "../config.json";
import { Contract, RpcProvider } from "starknet";
import { env } from "bun";
import { assert } from "ethers";

// For this final step we need our contract address, and the transaction we use as example.
const {
  yabContractAddress,
  testTransaction: {
    input: { dstAddress, amount },
  },
} = config;

/**
 * To access the data proven by Herodotus you need to use our contract on-chain that is responsible for this.
 * This contract is called `Facts Registry` you can see the source code here:
 * Use this page to see our most up to date deployments: https://herodotus.notion.site/8514ae5a125b4d4992fb6bd23c37c745?v=3166dbaeb11645e2a20d6fb348002922
 *
 * I made it easier and put the Facts Registry contract address here:
 * https://testnet.starkscan.co/contract/0x01b2111317eb693c3ee46633edd45a4876db14a3a53acdbf4e5166976d8e869d
 */
const herodotusFactsRegistryContractAddress =
  "0x01b2111317eb693c3ee46633edd45a4876db14a3a53acdbf4e5166976d8e869d";

/**
 * In this step we will access the proven data that is available on-chain!
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
  const provider = new RpcProvider({ nodeUrl: env.STARKNET_RPC_URL });

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
    [slots.amountSlot]: amount,
  };

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
}

//? Run this to test it out:
// bun start
