import Link from 'next/link';
// About page - minimal and plain

export default function About() {
  return (
    <div className="min-h-screen py-8 px-4">
      <main className="max-w-3xl mx-auto text-black">
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-700 no-underline">← Home</Link>
        </div>
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-semibold">ZK Token Distributor</h1>
          <p className="mt-2 text-sm text-gray-600">
            A minimal demo showing private token distribution using a Sparse Merkle Tree
            and zero-knowledge proofs. The project contains: a Foundry-based Merkle/proof
            generator, circom circuits for SMT proofs, and a Next.js web UI to sign-in and
            claim tokens.
          </p>
        </header>

        <section className="mb-6">
          <h2 className="text-lg font-medium mb-2">What you need</h2>
          <ul className="list-disc ml-5 text-sm text-gray-700">
            <li>Foundry (forge + anvil) to build/deploy contracts and run the Merkle script</li>
            <li>circom + snarkjs (or use the repo helper scripts) to compile and prove circuits</li>
            <li>Bun or Node.js to run the Next.js webapp (the repo includes a bun.lock)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium mb-2">Quick flow</h2>
          <ol className="list-decimal ml-5 text-sm text-gray-700">
            <li>Populate `data/addresses.csv` with `address,amount` rows.</li>
            <li>Run the Merkle generator script to produce leaves, root and per-user proofs.</li>
            <li>Compile & deploy contracts (Verifier + Token + Distributor) with Foundry.</li>
            <li>Point the webapp to deployed addresses and open the UI to sign-in and claim.</li>
          </ol>
        </section>

        <p className="mt-8 text-sm text-gray-600">
          See the repository README for exact commands,&nbsp;
          <Link href="https://github.com/afa7789/zk-token-distributor" target="_blank" className="underline text-blue-600">
            GitHub
          </Link>
        </p>
      </main>
    </div>
  );
}
