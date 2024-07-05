import { solidityPackedKeccak256 } from "ethers";
import config from "../config.json";

//? First let's explore the config.json file
// Below you will find all the fields in it explained
const {
  //? At the time of writing this code, their latest deployed contract address is: 0xaB20520fabd94812483B43c8c917D1490e15ee88
  yabContractAddress,
  //? An example transaction we will be testing on
  // We need it to get the mapping key, this is not universal
  // It's specific to the YAB contract's functionality
  // If you're getting a simpler storage slot, or using a different contract, chances are that you won't be needing this
  testTransaction: {
    //? The transaction hash, e.g. 0x11dfd71bf2c1c33ffe8b921abe56ceb8feae4d41dd342d054654bc064cae62d5
    // Gotten from https://goerli.etherscan.io/address/0xaB20520fabd94812483B43c8c917D1490e15ee88 (the yab contract on etherscan, you can see a list of transactions there)
    // Click on the "Transactions" tab, select any "Transfer" method transaction
    hash,
    //? Input, gotten from: https://goerli.etherscan.io/tx/0x11dfd71bf2c1c33ffe8b921abe56ceb8feae4d41dd342d054654bc064cae62d5
    // Click on the "More Details: + Click to show more"
    // Get the "Input Data" values for uint256 orderId, uint256 destAddress, uint256 amount
    input: { orderId, dstAddress, amount },
  },
  /*
        * From `forge inspect YABTransfer storage-layout --pretty` (`bun storage-layout`) result:
      
        | Name      | Type                                                | Slot | Offset | Bytes | Contract                        |
        |-----------|-----------------------------------------------------|------|--------|-------|---------------------------------|
        | transfers | mapping(bytes32 => struct YABTransfer.TransferInfo) | 0    | 0      | 32    | src/YABTransfer.sol:YABTransfer |
      
        ? 0 - Slot of the transfers mapping in YABTransfer.sol
        */
  transfersMappingSlot,
} = config;

/**
 * Now that we've know what we have in the config
 * Let's get the storage slots
 */
export function getSlots() {
  /**
   * First we need to understand what is the mapping key, the type is bytes32,
   * but how we get those 32 bytes to get what we want from the mapping is the thing we're interested in.
   *
   * We have to look at the contract, in the contract there is this:
   *
   * From YABTransfer.sol
   * ```solidity
   * bytes32 index = keccak256(abi.encodePacked(orderId, destAddress, amount));
   * require(transfers[index].isUsed == false, "Transfer already processed.");
   * ```
   *
   * So we now see that the byte32 is actually a keccak of the packed data of orderId, destAddress and amount:
   *
   * keccak256(abi.encodePacked(orderId, destAddress, amount)) - transfers mapping key
   *
   * Let's recreate that in TypeScript:
   */
  const transfersMappingKey = solidityPackedKeccak256(
    ["uint256", "uint256", "uint256"],
    [orderId, dstAddress, amount]
  );

  /**
   * As we've seen in the storage layout, the mapping is bytes32 => struct YABTransfer.TransferInfo
   * Since we've found the mapping key, we can now get the slot of the mapping in YABTransfer.sol
   *
   * ```solidity
   * struct TransferInfo {
   *    uint256 destAddress;
   *    uint256 amount;
   *    bool isUsed;
   * }
   * ```
   *
   * However, this struct is too big for one slot, we have two uint256 - two slots, plus one bool at the end - one slot
   *
   * ? For more info see: https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html#mappings-and-dynamic-arrays
   *
   * Based on the above information, the slot of the destAddress in the struct is the slot gotten by the mapping key.
   */
  const destAddressSlot = solidityPackedKeccak256(
    ["uint256", "uint256"],
    [transfersMappingKey, transfersMappingSlot]
  );
  /** Then, we need to get the `slot + 1` to get the `amount` slot */
  const amountSlot = "0x" + (BigInt(destAddressSlot) + 1n).toString(16);
  /** Then we need to get the `slot + 2` to get the `isUsed` slot */
  const isUsedSlot = "0x" + (BigInt(destAddressSlot) + 2n).toString(16);

  // Finally let's print everything out
  console.log("[GET SLOTS]", {
    transfersMappingKey,
    transfersMappingSlot,
    destAddressSlot,
    amountSlot,
    isUsedSlot,
  });

  // And return the slots
  return {
    destAddressSlot,
    amountSlot,
    isUsedSlot,
  };
}

//? Run this to test it out:
// bun test get-slots
