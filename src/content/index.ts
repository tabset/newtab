// 拦截 Cmd+D (Mac) / Ctrl+D (Windows)，用插件新建书签替代浏览器原生收藏
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
    e.preventDefault()
    e.stopImmediatePropagation()
    chrome.runtime.sendMessage({
      type: 'ADD_BOOKMARK_FROM_PAGE',
      url: location.href,
      title: document.title,
    }).catch(() => {})
  }
}, true)
