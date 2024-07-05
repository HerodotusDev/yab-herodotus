import { solidityPackedKeccak256 } from "ethers";
import config from "../config.json";

//? First let's explore the config.json file
// Below you will find all the fields in it explained
const {
  //? A block number in which you want to prove storage
  blockNumber,
  //? At the time of writing this code, their latest deployed contract address is: 0x47487b765FF80f5360CAA65c8EE9428927392Af4
  yabContractAddress,
  //? An example transaction we will be testing on
  // We need it to get the mapping key, this is not universal
  // It's specific to the YAB contract's functionality
  // If you're getting a simpler storage slot, or using a different contract, chances are that you won't be needing this
  testTransaction: {
    //? The transaction hash, e.g. 0x11dfd71bf2c1c33ffe8b921abe56ceb8feae4d41dd342d054654bc064cae62d5
    // Gotten from https://sepolia.etherscan.io/address/0x47487b765FF80f5360CAA65c8EE9428927392Af4 (the yab contract on etherscan, you can see a list of transactions there)
    // Click on the "Transactions" tab, select any "Transfer" method transaction
    hash,
    //? Input, gotten from: https://sepolia.etherscan.io/tx/0x0b4d03ef2dcb6149e1ee8b09702510d6f403011e9b78d25c40a15ed0daaf4bd9
    // Click on the "More Details: + Click to show more"
    // Get the "Input Data" values for uint256 orderId, uint256 destAddress, uint8 chainId
    // Use the "Value" field as the value
    input: { orderId, dstAddress, chainId, value },
  },
  /*
    * From `forge inspect PaymentRegistry storage-layout --pretty` (`bun storage-layout`) result:

    | Name                               | Type                                                    | Slot | Offset | Bytes | Contract                                |
    |------------------------------------|---------------------------------------------------------|------|--------|-------|-----------------------------------------|
    | transfers                          | mapping(bytes32 => struct PaymentRegistry.TransferInfo) | 0    | 0      | 32    | src/PaymentRegistry.sol:PaymentRegistry |

    ? 0 - Slot of the transfers mapping in PaymentRegistry.sol
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
   * From PaymentRegistry.sol
   * ```solidity
   * bytes32 index = keccak256(abi.encodePacked(orderId, destAddress, msg.value, chainId));
   * ```
   *
   * So we now see that the byte32 is actually a keccak of the packed data of orderId, destAddress and amount:
   *
   * keccak256(abi.encodePacked(orderId, destAddress, msg.value, chainId)) - transfers mapping key
   *
   * Let's recreate that in TypeScript:
   */
  const transfersMappingKey = solidityPackedKeccak256(
    // We need to know the types
    // first two are easy because we can see them in code of PaymentRegistry
    // value is the msg.value - uint256
    // chainId is the enum Chain which has two options Starknet, ZKSync - this will be cast to uint8 with 0 representing Starknet and 1 representing ZKSync
    ["uint256", "uint256", "uint256", "uint8"],
    [orderId, dstAddress, value, chainId]
  );

  /**
   * As we've seen in the storage layout, the mapping is bytes32 => struct PaymentRegistry.TransferInfo
   * Since we've found the mapping key, we can now get the slot of the mapping in PaymentRegistry.sol
   *
   * ```solidity
   * struct TransferInfo {
   *    uint256 destAddress;
   *    uint256 amount;
   *    bool isUsed;
   *    Chain chainId;
   * }
   * ```
   *
   * However, this struct is too big for one slot, we have two uint256 - two slots,
   * plus one bool and chainId is a uint8 - one slot!
   *
   * ? For more info see: https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html#mappings-and-dynamic-arrays
   */
  const baseStorageSlot = solidityPackedKeccak256(
    ["uint256", "uint256"],
    [transfersMappingKey, transfersMappingSlot]
  );
  /** Based on the above information, the slot of the destAddress in the struct is the slot gotten by the mapping key. */
  const destAddressSlot = baseStorageSlot;
  /** Then, we need to get the `slot + 1` to get the `amount` slot */
  const amountSlot = "0x" + (BigInt(baseStorageSlot) + 1n).toString(16);
  /** Then we need to get the `slot + 2` to get the `isUsed` and `chainId` - we will get the separate values in the last step */
  const isUsedAndChainIdSlot =
    "0x" + (BigInt(baseStorageSlot) + 2n).toString(16);

  // Finally let's print everything out
  console.log("[GET SLOTS]", {
    transfersMappingKey,
    transfersMappingSlot,
    destAddressSlot,
    amountSlot,
    isUsedAndChainIdSlot,
  });

  // And return the slots
  return {
    destAddressSlot,
    amountSlot,
    isUsedAndChainIdSlot,
  };
}

//? Run this to test it out:
// bun test get-slots
