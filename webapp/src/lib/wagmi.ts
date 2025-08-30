import { createConfig, http } from "wagmi";
import { foundry } from "wagmi/chains";

// Configure Wagmi to only use the local Foundry/Anvil chain (31337)
export const config = createConfig({
  chains: [foundry],
  transports: {
    [foundry.id]: http("http://127.0.0.1:8545"),
  },
});
