chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "SHOW_WARNING") {
        displayWarning(message.data);
    }
});

function displayWarning(data) {
    // Check if warning already exists
    if (document.getElementById('phishguard-warning')) return;

    const overlay = document.createElement('div');
    overlay.id = 'phishguard-warning';
    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 0, 0, 0.95);
    z-index: 9999999;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    text-align: center;
    padding: 20px;
  `;

    overlay.innerHTML = `
    <h1 style="font-size: 48px; margin-bottom: 10px;">🛡️ PhishGuard Alert</h1>
    <h2 style="font-size: 24px; margin-bottom: 20px;">DANGER: This page looks like a phishing site!</h2>
    <div style="background: white; color: black; padding: 20px; border-radius: 10px; max-width: 600px; margin-bottom: 20px;">
      <p><strong>Risk Score:</strong> ${data.risk_score}/100</p>
      <p><strong>Reasons:</strong></p>
      <ul style="text-align: left;">
        ${data.reasons.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
    <button id="close-warning" style="padding: 15px 30px; font-size: 18px; cursor: pointer; background: white; border: none; border-radius: 5px; font-weight: bold;">
      I understand the risk, let me through
    </button>
  `;

    document.body.appendChild(overlay);

    document.getElementById('close-warning').onclick = () => {
        overlay.remove();
    };
}
