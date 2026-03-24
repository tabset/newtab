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
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'ADD_BOOKMARK_FROM_PAGE') return
  // 存储待新增的书签数据，新标签页加载后读取
  chrome.storage.local.set({
    pendingBookmark: { url: msg.url, title: msg.title, ts: Date.now() },
  }, () => {
    chrome.tabs.create({ url: 'newtab.html' })
  })
})
