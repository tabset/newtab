const features = [
  {
    icon: '⌘',
    title: 'Smart Dock',
    desc: 'Pin your most-used apps and websites to a persistent Dock at the bottom of every new tab. Fully customizable — add, remove, and reorder with drag & drop.',
    tag: 'Productivity',
  },
  {
    icon: '🔖',
    title: 'Bookmark Manager',
    desc: 'Organize bookmarks into folders, bulk edit or delete, and launch them in one click. A clean launchpad that replaces the cluttered browser bookmark bar.',
    tag: 'Organization',
  },
  {
    icon: '🖼',
    title: 'Daily Wallpapers',
    desc: "Set a custom local image or let Bing's daily photo refresh your workspace automatically. Every tab feels fresh and personal.",
    tag: 'Aesthetic',
  },
  {
    icon: '🔍',
    title: 'Multi-engine Search',
    desc: 'Search Google, Bing, DuckDuckGo, and more — right from your new tab page. Switch engines on the fly without changing browser settings.',
    tag: 'Search',
  },
  {
    icon: '⌘D',
    title: 'Quick Bookmark',
    desc: 'Press Cmd+D (Mac) or Ctrl+D (Windows) on any page to save it instantly via an in-page dialog — without leaving the current tab.',
    tag: 'Speed',
  },
  {
    icon: '🌐',
    title: 'Embedded Mode',
    desc: 'Browse any website directly inside your new tab page using the built-in embedded iframe viewer. Works even on sites with iframe restrictions.',
    tag: 'Power User',
  },
  {
    icon: '🌍',
    title: 'Multi-language',
    desc: 'Available in English, 简体中文, 繁體中文, 日本語, 한국어, and Русский. The UI adapts automatically to your browser language.',
    tag: 'i18n',
  },
  {
    icon: '🌙',
    title: 'Dark by Design',
    desc: "Crafted with a dark-first aesthetic — easy on the eyes day and night. No blinding white flash when you open a new tab.",
    tag: 'Design',
  },
]

export default function Features() {
  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-header">
          <p className="section-label">Features</p>
          <h2 className="section-title">Everything you need.<br />Nothing you don't.</h2>
          <p className="section-sub">
            NewTab is designed to be your productive home base — beautiful, fast, and distraction-free.
          </p>
        </div>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-tag">{f.tag}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
