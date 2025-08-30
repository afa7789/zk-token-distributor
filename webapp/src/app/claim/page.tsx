import Link from 'next/link';

export default function Claim() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                ZK Token Distributor
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/about"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                About
              </Link>
              <Link
                href="/"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Claim Your Tokens
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Upload your proof file to claim your ZK tokens
            </p>
          </div>

          {/* Upload Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Upload Proof File
            </h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="space-y-2">
                <div className="text-gray-600">
                  <p>Drag & drop your proof JSON file here, or click to select</p>
                </div>
                <p className="text-sm text-gray-500">
                  Accepts JSON files up to 1MB
                </p>
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  Select File
                </button>
              </div>
            </div>
          </div>

          {/* Proof Details */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Proof Details
            </h3>
            <div className="text-sm text-gray-500">
              Upload a proof file to see details here
            </div>
          </div>

          {/* Claim Button */}
          <div className="text-center">
            <button
              disabled
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gray-400 cursor-not-allowed"
            >
              Claim Tokens
            </button>
            <p className="mt-2 text-sm text-gray-500">
              Upload a valid proof file to enable claiming
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
