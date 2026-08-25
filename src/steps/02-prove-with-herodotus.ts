import axios from "axios";
import config from "../config.json";
import { env, sleep } from "bun";
import { getSlots } from "./01-get-slots";

const MISSION_CONTROL_URL = "https://mission-control.api.herodotus.cloud";

//? We get the yab contract address from the config.json file
const { yabContractAddress } = config;

//? If you run this program before you can paste your Herodotus Request ID here to speed things up
// Note: if you changed something in what you want to send to Herodotus you need to keep this empty to send a new request.
let herodotusRequestId = "";

/**
 * Let's first prepare a function that will allow us to prove slots with Herodotus.
 *
 * For the params we'll need:
 *
 * @param slots - the slots we want to prove (computed in 01-get-slots.ts)
 * @param blockNumber - the block number in which we want to prove the slots
 *
 * when proving storage we always have to think about the time dimension, for example:
 *
 * the slots we want to prove here didn't exist at block number 0 as even this contract didn't exist then,
 * similarly, a storage slot value might change in the future,
 * so you need to know the "time" (block number) at which you want to prove the storage.
 */
export async function proveWithHerodotus(
  slots: ReturnType<typeof getSlots>,
  blockNumber: number
) {
  //? Let's construct a query to the Herodotus Storage Proof API (Mission Control)
  const herodotusQuery = {
    // We need a destination chain - the chain where the proven data will be available
    destination_chain_id: "SN_SEPOLIA",
    // Now the data object, here we specify what we want and from where
    data: {
      // This key is saying from which chain we want to get the data from
      "11155111": {
        // Then we specify the "time" dimension - you can either use `block:<blockNumber>` or `timestamp:<timestamp>`
        [`block:${blockNumber}`]: {
          // To prove the storage slot we need to prove an account (the yab contract on starknet)
          accounts: {
            // We provide the exact address of the account that has the slot
            [yabContractAddress]: {
              // And finally we pass the slot we want to prove
              slots: [
                slots.destAddressSlot,
                slots.amountSlot,
                slots.isUsedAndChainIdSlot,
              ],
            },
          },
        },
      },
    },
  };

  // This is just the check that skips sending a new request to Herodotus if you already sent one, don't worry about this
  if (!herodotusRequestId) {
    // Now we send the constructed query to Mission Control and get the response
    const resp = await axios
      .post<{ status: string; request_id: string }>(
        `${MISSION_CONTROL_URL}/submit-request`,
        herodotusQuery,
        {
          headers: {
            // You need your Herodotus API key in the .env file to use this endpoint
            "api-key": env.HERODOTUS_API_KEY as string,
            "Content-Type": "application/json",
          },
        }
      )
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });

    // And finally let's save the request_id that we got from Herodotus to keep track of the progress of the query
    // We need this because the query might take a while
    // Think of this like a transaction hash of an on-chain transaction
    // You need it to see when the transaction (in our case query) is finished
    herodotusRequestId = resp.data.request_id;
  }

  // Let's print it out, you can also re-use this if you want to run this code again
  // Just put the request id in the herodotusRequestId at the top of this file
  console.log("Herodotus Request ID:", herodotusRequestId);
  const url = `https://www.herodotus.cloud`;
  console.log(`Track requests in the Herodotus Console: ${url}`);
  // Most of the time this will be done way faster, but be patient just in case
  console.log(
    "\nThis might take even up to 20 mins (most of the queries are much faster), sit back and relax :)"
  );

  // Now we will http poll to check the status of our query every few seconds
  // When you implement this yourself, the best way is to use our webhooks, but here for simplicity we will use http poll
  // See the documentation: https://docs.herodotus.cloud/storage-proofs-api/quick-start-guide

  // Let's begin with saving the current timestamp (in seconds)
  const timestamp = Date.now() / 1000;
  // We will keep the polling alive for 30 minutes, then we will timeout
  const try_for = 60 * 30;

  // This is the loop that will run until every query reaches COMPLETED or it timeouts
  while (timestamp + try_for > Date.now() / 1000) {
    // Now we ask Mission Control for the queries belonging to our request
    const resp = await axios
      .get<{
        queries: Array<{ internal_id: string; status: string }>;
      }>(`${MISSION_CONTROL_URL}/get_queries/${herodotusRequestId}`, {
        headers: {
          "api-key": env.HERODOTUS_API_KEY as string,
        },
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });

    const queries = resp.data.queries ?? [];
    const allDone =
      queries.length > 0 &&
      queries.every((q) => q.status === "COMPLETED" || q.status === "FAILED");
    const anyFailed = queries.some((q) => q.status === "FAILED");

    if (allDone) {
      if (anyFailed) {
        console.error("\nOne or more queries failed.\n");
        process.exit(1);
      }
      console.log("\nQuery is done!\n");
      break;
    } else {
      // Otherwise, we log a dot
      process.stdout.write(".");
      // and wait for 5 seconds before trying again
      await sleep(5 * 1000);
    }
  }
}
