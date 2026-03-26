const screenshots = [
  { file: 'builtin.png', label: 'Home', desc: 'Clean new tab with Dock, search, and daily wallpaper' },
  { file: 'bookmark.png', label: 'Bookmarks', desc: 'Organized bookmark launchpad with folder support' },
  { file: 'background.png', label: 'Wallpaper', desc: 'Custom local images or Bing daily photos' },
  { file: 'bookmark_new.png', label: 'Quick Save', desc: 'Cmd+D in-page bookmark dialog' },
]

export default function Showcase() {
  return (
    <section className="showcase">
      <div className="container">
        <div className="section-header">
          <p className="section-label">Screenshots</p>
          <h2 className="section-title">See it in action</h2>
        </div>
        <div className="showcase-grid">
          {screenshots.map((s) => (
            <div key={s.file} className="showcase-item">
              <div className="browser-frame">
                <div className="browser-bar">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                  <div className="address-bar">newtab</div>
                </div>
                <div className="browser-content">
                  <img src={`/screenshot/${s.file}`} alt={s.label} className="screenshot-img" />
                </div>
              </div>
              <div className="showcase-caption">
                <strong>{s.label}</strong>
                <span>{s.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
