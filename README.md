# [YAB](https://github.com/GrindLabsOrg/yet-another-bridge) <> Herodotus

This repo serves as a step by step tutorial on how to use storage proofs from start to end. It's showcasing it on the [YAB](https://github.com/GrindLabsOrg/yet-another-bridge) contracts, to be more precise, their `transfers` mapping. This is quite an advanced example of a storage proof, as mappings, especially ones with custom `bytes32` as key, are quite tricky to work with, however this allows this tutorial to relay more knowledge.

## How to follow

**This `README.md` is a holistic overview of this tutorial, steps [Setup](#setup) & [0](#0-obtain-slot-from-storage-layout) are meant to be followed from this readme, however steps [1](#1-get-in-mapping-slot), [2](#2-prove-the-slots-with-herodotus) & [3](#3-access-proven-slots) are described in depth inside the code, follow the hyperlinks to code files, and run scripts at the end to see the results (note that there is no script for step [2](#2-prove-the-slots-with-herodotus), just continue to step [3](#3-access-proven-slots)).**

## Setup

You need these installed:

- [Bun](https://bun.sh/)
- [Foundry](https://getfoundry.sh/)

First make sure you:

- Copy the `.env.example` to `.env` and fill in the values.

  - Get the Herodotus API key from [here](https://dashboard.herodotus.dev/).
  - You can get the RPC_URLs from [Alchemy](https://www.alchemy.com/), [Infura](https://infura.io/) or any other provider. (I placed some free urls in the .env.example, they might work or not, you can try them out)

- Run:
  ```bash
  bun i
  ```

## 0. Obtain Slot from Storage Layout

### Using [hardhat-storage-layout](https://www.npmjs.com/package/hardhat-storage-layout)

```bash
bun storage-layout
```

### Or tool like https://storage.herodotus.dev/ or https://evm.storage/

If you want to get the storage layout for a deployed contract, just grab the address and check it there, but we will continue with the storage layout we got from the previous step.

## 1. Get In-Mapping Slot

The YAB slots we are interested in are a mapping. It requires additional steps to get a particular slot.

```solidity
mapping(bytes32 => struct YABTransfer.TransferInfo)
```

### [01-get-slots.ts](./src/steps/01-get-slots.ts)

To test if the slots are correct, run:

```bash
bun test get-slots
```

## 2. Prove the Slot/s with Herodotus

### [02-prove-slots.ts](./src/steps/02-prove-slots.ts)

> Note: This step doesn't have a separate run script, please move to the next step.

## 3. Access Proven Slots

### [03-access-slots.ts](./src/steps/03-access-slots.ts)

### Run the whole flow

```bash
bun start
```
