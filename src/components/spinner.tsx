
const Spinner = ({ text = "Loading your Dashboard" }) => {

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white">
              
      {/* Wallet Spinner */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-2xl border-4 border-teal-500 border-t-transparent animate-spin"></div>

          <div className="absolute inset-3 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg">
          <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 9V7a4 4 0 00-8 0v2M5 9h14l1 10H4L5 9z"
            />
          </svg>
        </div>
      </div>

      {/* App Name */}
      <h1 className="mt-5 text-2xl font-bold text-teal-600 tracking-wide">
          HomeWallet
      </h1>

      {/* Loading Text */}
      <p className="mt-2 text-gray-500 text-sm animate-pulse">
          {text}
      </p>
    </div>
)};

export default Spinner;