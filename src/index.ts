import { accessSlots } from "./steps/03-access-slots";
import { getSlots } from "./steps/01-get-slots";
import { proveWithHerodotus } from "./steps/02-prove-with-herodotus";
import config from "./config.json";

//? We will take the block number from config as example
const blockNumber = config.blockNumber;
//? Get the slots
const slots = getSlots();
//? Prove the slots with Herodotus
await proveWithHerodotus(slots, blockNumber);
//? Access proven slots
await accessSlots(slots, blockNumber);
