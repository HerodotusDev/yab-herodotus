import { getSlots } from "./01-get-slots";
import config from "../config.json";
import { Contract, RpcProvider } from "starknet";
import { env } from "bun";
import { assert } from "ethers";

const {
  yabContractAddress,
  testTransaction: {
    input: { dstAddress, amount },
  },
} = config;

/**
 * https://testnet.starkscan.co/contract/0x01b2111317eb693c3ee46633edd45a4876db14a3a53acdbf4e5166976d8e869d
 */
const herodotusFactsRegistryContractAddress =
  "0x01b2111317eb693c3ee46633edd45a4876db14a3a53acdbf4e5166976d8e869d";

export async function accessSlots(
  slots: ReturnType<typeof getSlots>,
  blockNumber: number
) {
  const provider = new RpcProvider({ nodeUrl: env.STARKNET_PROVIDER_URL });

  const { abi } = await provider.getClassAt(
    herodotusFactsRegistryContractAddress
  );
  if (abi === undefined) throw new Error("no abi.");

  const contract = new Contract(
    abi,
    herodotusFactsRegistryContractAddress,
    provider
  );

  let slotsToCorrectValues = {
    [slots.destAddressSlot]: dstAddress,
    [slots.amountSlot]: amount,
  };

  for (const [slot, correctValue] of Object.entries(slotsToCorrectValues)) {
    let slotValue = await contract.get_slot_value(
      yabContractAddress,
      blockNumber,
      slot
    );
    slotValue = "0x" + slotValue.Some.toString(16).padStart(64, "0");
    console.log("[ACCESS SLOTS]", { slotValue, correctValue });

    assert(
      slotValue === correctValue,
      `Slot value is not correct, ${slotValue} !== ${correctValue}`,
      "VALUE_MISMATCH"
    );
  }
}
