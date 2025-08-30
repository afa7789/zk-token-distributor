import { ConnectKitButton } from "connectkit";
import { useContractRead } from "wagmi";
import { ZKAirDroppedToken__factory } from "@/types";

const contractAddress = "YOUR_CONTRACT_ADDRESS";

export default function Home() {
  const { data } = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: ZKAirDroppedToken__factory.abi,
    functionName: "totalSupply",
  });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-8">ZK Token Distributor</h1>
      <ConnectKitButton />
      <p className="mt-4">Total Supply: {data?.toString()}</p>
    </div>
  );
}
