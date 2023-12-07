import axios from "axios";
import config from "../config.json";
import { env, sleep } from "bun";
import { getSlots } from "./01-get-slots";

const { yabContractAddress } = config;

//? Paste your Herodotus Query ID here if you have one already and don't want to wait for another one
let herodotusQueryId = "01HH2CCCJMJ7CM8K1D22CS3RRA";

export async function proveWithHerodotus(
  slots: ReturnType<typeof getSlots>,
  blockNumber: number
) {
  const herodotusQuery = {
    destinationChainId: "SN_GOERLI",
    fee: "0",
    data: {
      "5": {
        [`block:${blockNumber}`]: {
          accounts: {
            [yabContractAddress]: {
              slots: [slots.destAddressSlot, slots.amountSlot],
            },
          },
        },
      },
    },
  };

  if (!herodotusQueryId) {
    const {
      data: { internalId },
    } = await axios
      .post("https://api.herodotus.cloud/submit-batch-query", herodotusQuery, {
        params: {
          apiKey: env.HERODOTUS_API_KEY,
        },
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
    herodotusQueryId = internalId;
  }

  console.log("Herodotus Query ID:", herodotusQueryId);
  console.log("\nThis might take even ~20 mins, sit back and relax :)");

  const timestamp = Date.now() / 1000;
  while (timestamp + 60 * 30 > Date.now() / 1000) {
    const {
      data: { queryStatus },
    } = await axios
      .get(`https://api.herodotus.cloud/batch-query-status`, {
        params: {
          batchQueryId: herodotusQueryId,
          apiKey: env.HERODOTUS_API_KEY,
        },
      })
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });

    if (queryStatus === "DONE") {
      console.log("\nQuery is done!");
      break;
    } else {
      process.stdout.write(".");
      await sleep(5 * 1000);
    }
  }
}
