import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { V2 } from "../target/types/v2";

describe("v2", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.V2 as Program<V2>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);
  });
});
