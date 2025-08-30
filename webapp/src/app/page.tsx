import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useFileManagement } from "@/hooks/useFileManagement";

export default function Home() {
  const { address, isConnected } = useAccount();
  const { isAuthenticated, signIn, signOut, sessionToken } = useAuth();
  const { generateCalldata, isGenerating, error } = useFileManagement();

  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                ZK Token Distributor
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/about"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                About
              </Link>
              <Link
                href="/calldata"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Calldata
              </Link>
              <Link
                href="/claim"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Claim
              </Link>
              <ConnectKitButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Welcome to ZK Token Distribution
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Claim your tokens privately using zero-knowledge proofs
            </p>
          </div>

          {/* Connection Status */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Connection Status
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Wallet Connected:</span>{" "}
                <span className={isConnected ? "text-green-600" : "text-red-600"}>
                  {isConnected ? "Yes" : "No"}
                </span>
              </p>
              {address && (
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Address:</span>{" "}
                  <span className="font-mono">{address}</span>
                </p>
              )}
              <p className="text-sm text-gray-600">
                <span className="font-medium">Authenticated:</span>{" "}
                <span className={isAuthenticated ? "text-green-600" : "text-red-600"}>
                  {isAuthenticated ? "Yes" : "No"}
                </span>
              </p>
            </div>
          </div>

          {/* Authentication Section */}
          {isConnected && !isAuthenticated && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Sign In with Ethereum
              </h3>
              <p className="text-gray-600 mb-4">
                Sign a message to authenticate and access your token claims.
              </p>
              <button
                onClick={handleSignIn}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Authenticated User Actions */}
          {isAuthenticated && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Available Actions
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Download Calldata
                    </h4>
                    <p className="text-sm text-gray-500">
                      Download your personal claim data file
                    </p>
                  </div>
                  <Link 
                    href="/calldata"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Download
                  </Link>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Generate Calldata
                    </h4>
                    <p className="text-sm text-gray-500">
                      Generate proof data for token claiming (Legacy)
                    </p>
                  </div>
                  <button 
                    onClick={async () => {
                      if (address && sessionToken) {
                        try {
                          await generateCalldata(address, sessionToken);
                        } catch (err) {
                          console.error('Generation failed:', err);
                        }
                      }
                    }}
                    disabled={isGenerating}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Claim Tokens
                    </h4>
                    <p className="text-sm text-gray-500">
                      Claim your tokens using generated proof
                    </p>
                  </div>
                  <Link 
                    href="/claim"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Claim
                  </Link>
                </div>

                <button
                  onClick={signOut}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
