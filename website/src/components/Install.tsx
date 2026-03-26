export default function Install() {
  return (
    <section className="install" id="install">
      <div className="container">
        <div className="section-header">
          <p className="section-label">Install</p>
          <h2 className="section-title">Get started in seconds</h2>
          <p className="section-sub">Choose your preferred installation method.</p>
        </div>
        <div className="install-grid">
          {/* Chrome Web Store */}
          <div className="install-card install-card--primary">
            <div className="install-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="20" fill="url(#cws-grad)" />
                <circle cx="20" cy="20" r="8" fill="white" />
                <circle cx="20" cy="20" r="5" fill="#4285F4" />
                <defs>
                  <linearGradient id="cws-grad" x1="0" y1="0" x2="40" y2="40">
                    <stop stopColor="#7c5cfc" />
                    <stop offset="1" stopColor="#3cb4ff" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="install-badge">Recommended</div>
            <h3>Chrome Web Store</h3>
            <p>One-click install, auto-updates included. Works on Chrome, Edge, and other Chromium browsers.</p>
            <ol className="install-steps">
              <li>Click the button below</li>
              <li>Click <strong>Add to Chrome</strong></li>
              <li>Open a new tab — done!</li>
            </ol>
            <a
              href="https://chrome.google.com/webstore"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-lg install-btn"
            >
              Add to Chrome
            </a>
          </div>

          {/* Manual Install */}
          <div className="install-card">
            <div className="install-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" style={{color: 'var(--muted)'}}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </div>
            <h3>Manual Install</h3>
            <p>Install the unpacked extension from GitHub for development or offline use.</p>
            <ol className="install-steps">
              <li>Download the latest <code>.zip</code> from <a href="https://github.com/tabset/newtab/releases" target="_blank" rel="noreferrer">GitHub Releases</a></li>
              <li>Unzip to a local folder</li>
              <li>Go to <code>chrome://extensions</code></li>
              <li>Enable <strong>Developer mode</strong></li>
              <li>Click <strong>Load unpacked</strong> → select the folder</li>
            </ol>
            <a
              href="https://github.com/tabset/newtab/releases"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-lg install-btn"
            >
              Download ZIP
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
