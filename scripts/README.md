# `scripts`
This is a temporary folder for testing our program with Javascript client code. Most of the code here will soon be moved to the `js` folder which holds our Javascript/Typescript API.

Current usage is as follows:
- All amounts are in their most atomic denomination.
- All public key inputs should be in base 58.
- `initialize.js`: `node initialize [payee] [amount] [duration]`
- `depositTemp.js`: `node depositTemp [payee] [amount] [duration] [subscription count] [deposit amount]`
- `renew.js`: `node depositTemp [payee] [amount] [duration] [subscription count]`
- `transferTemp.js`: `node transferTemp [payee] [amount] [duration] [subscription count] [receiver]`
- `findTokenHolder.js`: Exports helper function for finding the owner of a token from a given mint.
- `initTokens.js`: Helper script to initialize a mint and token accounts for usage in scripts.
- `keys.js`: Exports pre-setup hardcoded keys for ease of use while testing with scripts.
- `subscription.ts`: Remains of deprecated attempt to add types/serialization.