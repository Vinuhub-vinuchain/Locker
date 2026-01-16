export default function Header() {
  return (
    <header className="text-center mb-8">
      {/* Logo - using absolute path from public/ folder */}
      <img
        src="/logo.png"
        alt="VinuHub Logo"
        className="logo mx-auto"
        width={120}
        height={120}
        // Fallback if logo fails to load (useful during testing)
        onError={(e) => {
          e.currentTarget.src = "https://via.placeholder.com/120?text=VinuHub";
          e.currentTarget.alt = "Logo fallback";
        }}
      />
      <h1 className="text-4xl font-bold mt-4">VinuHub Token & Liquidity Locker</h1>
      <p className="text-gray-400 mt-2">
        Securely lock your ERC20 or LP tokens on VinuChain
      </p>
    </header>
  );
}
