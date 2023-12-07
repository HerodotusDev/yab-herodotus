# YAB example

## Setup

You need these installed:

- [Bun](https://bun.sh/)
- [Foundry](https://getfoundry.sh/)

First make sure you do:

```bash
bun i
```

## Obtain Slot from Storage Layout

### Using [hardhat-storage-layout](https://www.npmjs.com/package/hardhat-storage-layout)

```bash
bun storage-layout
```

### Or tool like https://evm.storage/

If you want to get the storage layout for a deployed contract, just grab the address and check it there, but we will continue with the storage layout we got from the previous step.

## Get In-Mapping Slot

The YAB slots we are interested in are a mapping. It requires additional steps to get the full slot.

```solidity
mapping(bytes32 => struct YABTransfer.TransferInfo)
```

### [01-get-slots.ts](./src/steps/01-get-slots.ts)

To test if the slots are correct, run:

```bash
bun test get-slots
```

## Prove the Slot/s with Herodotus

### [02-prove-slots.ts](./src/steps/02-prove-slots.ts)

## Access Proven Slots

### [03-access-slots.ts](./src/steps/03-access-slots.ts)

## Run the whole flow

```bash
bun start
```
