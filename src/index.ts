import { accessSlots } from "./steps/03-access-slots";
import { getSlots } from "./steps/01-get-slots";
import { proveWithHerodotus } from "./steps/02-prove-with-herodotus";
/**
 * A block number in which you want to prove storage, can be just:
 *
 * ```ts
 * const rpcUrl = env.RPC_URL;
 * const rpc = new JsonRpcProvider(rpcUrl);
 * const blockNumber = await rpc.getBlockNumber();
 * ```
 * ? we will take this block number as an example
 */
let blockNumber = 10173637;
//? Get the slots
const slots = getSlots();
//? Prove the slots with Herodotus
await proveWithHerodotus(slots, blockNumber);
//? Access proven slots
await accessSlots(slots, blockNumber);
