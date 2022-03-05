# Buoyant

> "Subs not dubs."

### Description
A base protocol implementing recurring payments.

### Motivation
Recurring payments are a very common and helpful payments model. They're used for time-bound access to content/services and for consistent streams of revenue. So far we haven't seen anything that really executes on this basic payments primitive, and also at the time of creating this there are <2 weeks left in Solana's Riptide Hackathon and we wanna build.

### Primary Features
- Allow a user to create a new subscription
- Allow a payer to deposit into a vault
- Expose a public function that either
    1. Transfers money from vault to payee and renews the subscription if a certain balance is met
    2. Marks the subscription inactive

    and compensates the caller.
- Make subscription activity/inactivity tied to a token

### Design
> TL;DR create a subscription with metadata and get a new NFT for each period the subscription is active. Anyone/cranks will be run to renew/deactivate subscriptions and they'll get a fee paid to them to incentivize.

When someone opens up a new subscription, they'll specify an amount of money to be paid and a duration of how long the subscription is active for. This will then initialize a new account with subscription metadata as well as a new token vault account for the payer to deposit to.

On initialization and renewal of a subscription, an new token mint is created and a token is minted to the payer (and a new associated token account for this particular mint is created as needed). A user's subscription is said to be "active" if the user owns a token from the particular mint. The latest mint's public key will be stored and updated in the subscription's metadata so that products built on top of this protocol have easy access to the necessary data needed to check the active/inactive status of a subscription.

When a subscription is renewed, a new mint will be created. If the deposit vault has enough tokens to renew, the amount will be transferred to the payee and a token from the new mint will be minted to the payer. 

The renewal instruction will be available for anyone to call. A certain percentage of the amount being transferred to the payee will be sent to the caller of the renewal instruction to incentivize a decentralized participation to enforce the renewal/expiry mechanic of the protocol. In the beginning, a centralized crank will be run to ensure the timely functioning of renewals/expirations. Overtime as usage grows, ideally fee incentives should naturally decentralize this mechanic.

**Token Functionality**

Because the subscription is represented with a token, it turns them into assets that are tradable on open markets. This not only allows for the simple transfer of a subscription if someone wants to gift it to a friend, but it also allows the ability to sell a subscription for a different duration than the original services' configuration, e.g. if you paid for a month-long subscription and after 20 days you no longer care for it, you could sell it to someone who might be looking for a 10-day trial for cheaper.

### Accounts
Flowchart coming soon.

### Roadmap
- [ ] Basic instruction implementations
    - [ ] Account flow chart
- [ ] Create email, twitter, and gitbook
- [ ] Integrate Metaplex token metadata standard
- [ ] Create a basic API for other projects to build on
    - [ ] Javascript/Typescript types and instruction wrappers
    - [ ] Rust instruction wrappers
    - [ ] Anchor accounts and contexts
- [ ] Crank/public renewal assistance