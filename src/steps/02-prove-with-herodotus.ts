import axios from "axios";
import config from "../config.json";
import { env, sleep } from "bun";
import { getSlots } from "./01-get-slots";

//? We get the yab contract address from the config.json file
const { yabContractAddress } = config;

//? If you run this program before you can paste your Herodotus Query ID here to speed things up
// Note: if you changed something in what you want to send to Herodotus you need to keep this empty to send a new request.
let herodotusQueryId = "";

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
  //? Let's construct a query to the Herodotus Storage Proofs API
  const herodotusQuery = {
    // We need a destination chain - the chain where the proven data will be available
    destinationChainId: "SN_SEPOLIA",
    // For testnets the fee is always 0, so don't worry about this
    fee: "0",
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
  if (!herodotusQueryId) {
    // Now we send the constructed query to Herodotus and get the response
    const resp = await axios
      .post<{ internalId: string }>(
        "https://api.herodotus.cloud/submit-batch-query",
        herodotusQuery,
        {
          params: {
            // You need your Herodotus API key in the .env file to use this endpoint
            apiKey: env.HERODOTUS_API_KEY,
          },
        }
      )
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });

    // And finally let's save the internalId that we got from Herodotus to keep track of the progress of the query
    // We need this because the query might take a while
    // Think of this like a transaction hash of an on-chain transaction
    // You need it to see when the transaction (in our case query) is finished
    herodotusQueryId = resp.data.internalId;
  }

  // Let's print it out, you can also re-use this if you want to run this code again
  // Just put the query id in the herodotusQueryId at the top of this file
  console.log("Herodotus Query ID:", herodotusQueryId);
  const url = `https://dashboard.herodotus.dev/explorer/query/${herodotusQueryId}`;
  const clickableLink = `\x1b]8;;${url}\x1b\\${url}\x1b]8;;\x1b\\`;
  console.log(`You can see the status of this query here: ${clickableLink}`);
  // Most of the time this will be done way faster, but be patient just in case
  console.log(
    "\nThis might take even up to 20 mins (most of the queries are much faster), sit back and relax :)"
  );

  // Now we will http pool to check the status of our query every minute
  // When you implement this yourself, the best way is to use our webhooks, but here for simplicity we will use http pool
  // See the documentation to learn more about webhooks: https://api.herodotus.cloud/docs

  // Let's begin with saving the current timestamp (in seconds)
  const timestamp = Date.now() / 1000;
  // We will keep the pooling alive for 30 minutes, then we will timeout
  const try_for = 60 * 30;

  // This is the loop that will run until we get status DONE or it timeouts
  while (timestamp + try_for > Date.now() / 1000) {
    // Now we ask the Herodotus API for the status of our query
    const resp = await axios
      .get<{ queryStatus: string }>(
        `https://api.herodotus.cloud/batch-query-status`,
        {
          params: {
            // We have to pass in the query id
            batchQueryId: herodotusQueryId,
            // and the API key
            apiKey: env.HERODOTUS_API_KEY,
          },
        }
      )
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });

    let queryStatus = resp.data.queryStatus;
    // Once the query is done
    if (queryStatus === "DONE") {
      // we log it to the console
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
