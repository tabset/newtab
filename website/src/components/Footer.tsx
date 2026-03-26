export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <a href="#" className="logo">
            <img src="/logo.png" alt="NewTab" className="logo-img" />
            <span className="logo-text">NewTab</span>
          </a>
          <p className="footer-tagline">The better tab. The better you.</p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#install">Install</a>
            <a href="https://github.com/tabset/newtab/blob/main/CHANGELOG.md" target="_blank" rel="noreferrer">Changelog</a>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a href="https://github.com/tabset/newtab" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://github.com/tabset/newtab/issues" target="_blank" rel="noreferrer">Report a Bug</a>
            <a href="/docs" target="_blank" rel="noreferrer">Documentation</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} NewTab. MIT License.</span>
        <span>Made with ♥ and open source.</span>
      </div>
    </footer>
  )
}
