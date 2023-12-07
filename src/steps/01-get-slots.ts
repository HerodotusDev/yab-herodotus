import { solidityPackedKeccak256 } from "ethers";
import config from "../config.json";

//? Config explanation:
const {
  //? At the time of writing this code, their latest deployed contract address is: 0xaB20520fabd94812483B43c8c917D1490e15ee88
  yabContractAddress,
  //? An example transaction we will be testing on
  testTransaction: {
    //? The transaction hash, e.g. 0x11dfd71bf2c1c33ffe8b921abe56ceb8feae4d41dd342d054654bc064cae62d5
    // Gotten from https://goerli.etherscan.io/address/0xaB20520fabd94812483B43c8c917D1490e15ee88
    // Click on the "Transactions" tab, select any "Transfer" method transaction
    hash,
    //? Input, gotten from: https://goerli.etherscan.io/tx/0x11dfd71bf2c1c33ffe8b921abe56ceb8feae4d41dd342d054654bc064cae62d5
    // Click on the "More Details: + Click to show more"
    // Get the "Input Data" values for uint256 orderId, uint256 destAddress, uint256 amount
    input: { orderId, dstAddress, amount },
  },
  /*
        * From `forge inspect YABTransfer storage-layout --pretty` result:
      
        | Name      | Type                                                | Slot | Offset | Bytes | Contract                        |
        |-----------|-----------------------------------------------------|------|--------|-------|---------------------------------|
        | transfers | mapping(bytes32 => struct YABTransfer.TransferInfo) | 0    | 0      | 32    | src/YABTransfer.sol:YABTransfer |
      
        ? 0 - Slot of the transfers mapping in YABTransfer.sol
        */
  transfersMappingSlot,
} = config;

/**
 * Get the storage slots
 */
export function getSlots() {
  /**
   * From YABTransfer.sol:
   *
   * ```solidity
   * bytes32 index = keccak256(abi.encodePacked(orderId, destAddress, amount));
   * require(transfers[index].isUsed == false, "Transfer already processed.");
   * ```
   *
   * keccak256(abi.encodePacked(orderId, destAddress, amount)) - transfers mapping key
   */
  const transfersMappingKey = solidityPackedKeccak256(
    ["uint256", "uint256", "uint256"],
    [orderId, dstAddress, amount]
  );

  /**
   * We need the `slot` to get the `destAddress` value
   *
   * ```solidity
   * struct TransferInfo {
   *    uint256 destAddress;
   *    uint256 amount;
   *    bool isUsed;
   * }
   * ```
   *
   * For more info see: https://docs.soliditylang.org/en/v0.8.17/internals/layout_in_storage.html#mappings-and-dynamic-arrays
   */
  const destAddressSlot = solidityPackedKeccak256(
    ["uint256", "uint256"],
    [transfersMappingKey, transfersMappingSlot]
  );
  /** We need the `slot + 1` to get the `amount` value */
  const amountSlot = "0x" + (BigInt(destAddressSlot) + 1n).toString(16);
  /** Ignore this, we won't be using it, but it's here for reference! */
  const isUsedSlot = "0x" + (BigInt(destAddressSlot) + 2n).toString(16);

  console.log("[GET SLOTS]", {
    transfersMappingKey,
    transfersMappingSlot,
    destAddressSlot,
    amountSlot,
    isUsedSlot,
  });

  return {
    destAddressSlot,
    amountSlot,
    isUsedSlot,
  };
}
