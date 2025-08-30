import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

export const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http("https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"),
    [sepolia.id]: http("https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"),
  },
});
