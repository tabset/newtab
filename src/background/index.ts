// Strip X-Frame-Options and CSP headers for sub_frame requests from this extension page
// so that embedded mode can display sites in iframes without being blocked.
function applyEmbeddedFrameRules() {
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [100],
    addRules: [{
      id: 100,
      priority: 1,
      action: {
        type: 'modifyHeaders' as chrome.declarativeNetRequest.RuleActionType,
        responseHeaders: [
          { header: 'x-frame-options', operation: 'remove' as chrome.declarativeNetRequest.HeaderOperation },
          { header: 'content-security-policy', operation: 'remove' as chrome.declarativeNetRequest.HeaderOperation },
          { header: 'content-security-policy-report-only', operation: 'remove' as chrome.declarativeNetRequest.HeaderOperation },
        ],
      },
      condition: {
        resourceTypes: ['sub_frame' as chrome.declarativeNetRequest.ResourceType],
        initiatorDomains: [chrome.runtime.id],
      },
    }],
  })
}

chrome.runtime.onInstalled.addListener(() => {
  applyEmbeddedFrameRules()
})

chrome.runtime.onStartup.addListener(() => {
  applyEmbeddedFrameRules()
})

// 接收来自内容脚本的"快速新增书签"消息
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== 'ADD_BOOKMARK_FROM_PAGE') return
  if (!sender.tab?.id) return

  const tabId = sender.tab.id
  const fallback = () => {
    chrome.storage.local.set(
      { pendingBookmark: { url: msg.url, title: msg.title, ts: Date.now() } },
      () => { chrome.tabs.create({ url: 'newtab.html' }) },
    )
  }

  // 将书签弹窗直接注入当前页面，无需新开标签页。
  // try-catch 捕获同步错误（如 scripting 权限未就绪时 chrome.scripting 为 undefined），
  // .catch 捕获 Promise 拒绝（如受限页面 chrome://、file:// 等），均回退到新开标签页。
  try {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-overlay.js'],
    }).catch(fallback)
  } catch {
    fallback()
  }
})
