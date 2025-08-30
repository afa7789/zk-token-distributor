import { createConfig, http } from "wagmi";
import { mainnet, sepolia, foundry } from "wagmi/chains";

export const config = createConfig({
  chains: [foundry, mainnet, sepolia],
  transports: {
    [foundry.id]: http("http://127.0.0.1:8545"),
    [mainnet.id]: http("https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"),
    [sepolia.id]: http("https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"),
  },
});
