export const logDebug = (message: string) => {
  console.log(`${new Date().toLocaleTimeString()}: ${message}`);
  const debugLog = document.getElementById('debug-log');
  if (debugLog) {
    debugLog.innerHTML += `<p>${new Date().toLocaleTimeString()}: ${message}</p>`;
    debugLog.scrollTop = debugLog.scrollHeight;
  }
};

export const shareOnX = (text: string, txHash: string) => {
  const url = txHash ? `${window.location.origin}/tx/${txHash}` : window.location.origin;
  const shareText = encodeURIComponent(`${text} ${url} #VinuHub #VinuChain`);
  window.open(`https://x.com/intent/tweet?text=${shareText}`, '_blank');
};
