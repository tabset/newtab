export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="hero-glow glow-1" />
        <div className="hero-glow glow-2" />
        <div className="hero-grid" />
      </div>
      <div className="container hero-inner">
        <div className="hero-badge">✦ Free & Open Source</div>
        <h1 className="hero-title">
          The better tab.<br />
          <span className="gradient-text">The better you.</span>
        </h1>
        <p className="hero-sub">
          Replace your default new tab with a beautiful, productive workspace —
          Dock shortcuts, smart bookmarks, daily wallpapers, and more.
        </p>
        <div className="hero-actions">
          <a href="#install" className="btn btn-primary btn-lg">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
            Add to Chrome — It's Free
          </a>
          <a href="https://github.com/tabset/newtab" target="_blank" rel="noreferrer" className="btn btn-ghost btn-lg">
            View on GitHub
          </a>
        </div>
        <div className="hero-screenshot">
          <div className="browser-frame">
            <div className="browser-bar">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
              <div className="address-bar">newtab</div>
            </div>
            <div className="browser-content">
              <img
                src="/screenshot/home.png"
                alt="NewTab screenshot"
                className="screenshot-img"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
