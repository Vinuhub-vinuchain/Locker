export default function Footer() {
  return (
    <footer className="text-center mt-8">
      <div className="flex justify-center space-x-4">
        <a
          href="https://t.me/VinuHubOfficial"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          Telegram
        </a>
        <a
          href="https://x.com/VinuHubOfficial"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          X
        </a>
      </div>
      <p className="text-gray-400 mt-2">&copy; 2025 VinuHub. All rights reserved.</p>
    </footer>
  );
}
