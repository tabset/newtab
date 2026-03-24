# 在线书签数据源格式说明

在线书签通过 `createUrlPlugin(id, url)` 从任意静态 URL 拉取 JSON 数据，本文档说明该 JSON 的完整格式，并覆盖所有图标类型的使用示例。

---

## 顶层结构

```json
{
  "version": "1.0",
  "categories": [ ... ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `version` | `string` | 格式版本号，当前固定为 `"1.0"` |
| `categories` | `StoreCategory[]` | 分类列表，按顺序渲染为面板顶部的 Tab |

---

## 分类 `StoreCategory`

```json
{
  "id": "ai-tools",
  "name": {
    "zh-CN": "AI 工具",
    "en": "AI Tools"
  },
  "items": [ ... ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | `string` | 分类唯一标识，英文小写，全局唯一 |
| `name` | `Record<lang, string>` | 多语言分类名称 |
| `items` | `StoreItem[]` | 该分类下的条目列表 |

---

## 条目 `StoreItem`

```json
{
  "id": "chatgpt",
  "name": {
    "zh-CN": "ChatGPT",
    "en": "ChatGPT"
  },
  "description": {
    "zh-CN": "OpenAI 的 AI 对话助手",
    "en": "AI assistant by OpenAI"
  },
  "url": "https://chat.openai.com",
  "icon": { ... }
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | ✅ | 条目唯一标识，全局唯一 |
| `name` | `Record<lang, string>` | ✅ | 多语言名称 |
| `description` | `Record<lang, string>` | ❌ | 多语言描述，建议不超过 40 字 |
| `url` | `string` | ❌ | 目标网址，收藏或打开时跳转 |
| `icon` | `StoreIcon` | ✅ | 图标配置，见下文四种类型 |

---

## 多语言说明

`name`、`description` 等文本字段均为多语言对象，支持以下语言键：

| 键 | 语言 |
|----|------|
| `zh-CN` | 简体中文 |
| `zh-TW` | 繁体中文 |
| `en` | 英文 |
| `ja` | 日文 |
| `ko` | 韩文 |
| `ru` | 俄文 |

**Fallback 规则**：优先取当前界面语言 → 回退 `zh-CN` → 回退 `en` → 取对象中第一个有值的语言。最少只需提供 `zh-CN` 或 `en` 之一。

---

## 图标 `StoreIcon`

```json
{
  "type": "url" | "svg" | "builtin" | "text",
  "value": "...",
  "bgColor": "#1c1c1c",
  "svgColor": "#ffffff",
  "fit": "contain" | "cover" | "fill"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | `string` | ✅ | 图标类型，共四种，见下文 |
| `value` | `string` | ✅ | 图标内容，含义随 `type` 变化 |
| `bgColor` | `string` | ✅ | 图标背景色，任意合法 CSS 颜色值 |
| `svgColor` | `string` | ❌ | 仅 `type=svg` 有效，统一替换 SVG 内所有 `fill`/`stroke` |
| `fit` | `string` | ❌ | 仅 `type=url` 有效，图片填充方式，默认 `contain` |

---

## 四种图标类型详解

### 1. `url` — 在线图片

`value` 为图片 URL，渲染为 `<img>` 标签。支持 PNG、SVG、WebP、ICO 等格式。`fit` 控制图片填充方式。

```json
{
  "id": "github",
  "name": { "zh-CN": "GitHub", "en": "GitHub" },
  "description": { "zh-CN": "全球最大代码托管平台", "en": "World's largest code hosting platform" },
  "url": "https://github.com",
  "icon": {
    "type": "url",
    "value": "https://github.com/favicon.ico",
    "bgColor": "#24292e",
    "fit": "contain"
  }
}
```

**`fit` 取值说明：**

| 值 | 效果 |
|----|------|
| `contain`（默认）| 保持比例缩放，完整显示图片，四周留空 |
| `cover` | 裁剪填满背景，无留白，适合方形 logo |
| `fill` | 拉伸至填满，不保持比例 |

---

### 2. `svg` — SVG 代码

`value` 为完整的 SVG 字符串，渲染为内联 SVG。`svgColor` 会自动替换 SVG 内所有 `fill` 和 `stroke` 的属性值，实现颜色统一。

```json
{
  "id": "custom-icon",
  "name": { "zh-CN": "自定义 SVG 图标", "en": "Custom SVG Icon" },
  "description": { "zh-CN": "使用 svgColor 统一控制图标颜色", "en": "Use svgColor to control icon color uniformly" },
  "url": "https://example.com",
  "icon": {
    "type": "svg",
    "value": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' fill='#fff' stroke='#fff' stroke-width='0.5'/></svg>",
    "bgColor": "#f59e0b",
    "svgColor": "#ffffff"
  }
}
```

**svgColor 工作原理：**

设置 `svgColor` 后，渲染时会将 SVG 字符串中所有 `fill="..."` 和 `stroke="..."` 属性值替换为指定颜色，适合单色图标统一上色。若需保留 SVG 原有多色，不设置 `svgColor` 即可。

---

### 3. `builtin` — 内置 Emoji

`value` 为 Emoji 字符，直接渲染为文字。无需网络请求，加载最快，适合快速搭建和原型展示。

```json
{
  "id": "producthunt",
  "name": { "zh-CN": "Product Hunt", "en": "Product Hunt" },
  "description": { "zh-CN": "每天发现最新最好的产品", "en": "Discover the best new products every day" },
  "url": "https://www.producthunt.com",
  "icon": {
    "type": "builtin",
    "value": "🚀",
    "bgColor": "#da552f"
  }
}
```

**字号自动缩放规则：**

| 字符数 | 字号（相对图标尺寸） |
|--------|-------------------|
| 1 个字符 | 48% |
| 2 个字符 | 36% |
| 3 个及以上 | 26% |

---

### 4. `text` — 文字

`value` 为任意文字字符串（字母、数字、中文等），渲染逻辑与 `builtin` 完全相同，语义上用于非 Emoji 的自定义文字图标，适合品牌缩写、字母 logo。

```json
{
  "id": "vscode",
  "name": { "zh-CN": "VS Code", "en": "VS Code" },
  "description": { "zh-CN": "微软出品的强大代码编辑器", "en": "Powerful code editor by Microsoft" },
  "url": "https://code.visualstudio.com",
  "icon": {
    "type": "text",
    "value": "VS",
    "bgColor": "#0078d4"
  }
}
```

中文单字同样适用：

```json
{
  "id": "zhihu",
  "name": { "zh-CN": "知乎", "en": "Zhihu" },
  "description": { "zh-CN": "中文互联网知识分享社区", "en": "Chinese knowledge-sharing community" },
  "url": "https://www.zhihu.com",
  "icon": {
    "type": "text",
    "value": "知",
    "bgColor": "#0f88eb"
  }
}
```

---

## 完整示例

以下是一个包含所有图标类型的完整 JSON 样例：

```json
{
  "version": "1.0",
  "categories": [
    {
      "id": "demo",
      "name": {
        "zh-CN": "示例分类",
        "en": "Demo Category"
      },
      "items": [
        {
          "id": "item-url",
          "name": { "zh-CN": "GitHub（url 图标）", "en": "GitHub (url icon)" },
          "description": { "zh-CN": "使用在线图片作为图标", "en": "Using a remote image as icon" },
          "url": "https://github.com",
          "icon": {
            "type": "url",
            "value": "https://github.com/favicon.ico",
            "bgColor": "#24292e",
            "fit": "contain"
          }
        },
        {
          "id": "item-svg",
          "name": { "zh-CN": "收藏（svg 图标）", "en": "Favorite (svg icon)" },
          "description": { "zh-CN": "使用 SVG 代码，svgColor 统一上色", "en": "SVG code with svgColor for unified coloring" },
          "url": "https://example.com",
          "icon": {
            "type": "svg",
            "value": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' fill='#fff'/></svg>",
            "bgColor": "#f59e0b",
            "svgColor": "#ffffff"
          }
        },
        {
          "id": "item-builtin",
          "name": { "zh-CN": "火箭（builtin 图标）", "en": "Rocket (builtin icon)" },
          "description": { "zh-CN": "使用 Emoji 作为图标，无需网络", "en": "Emoji icon, no network request needed" },
          "url": "https://example.com",
          "icon": {
            "type": "builtin",
            "value": "🚀",
            "bgColor": "#da552f"
          }
        },
        {
          "id": "item-text",
          "name": { "zh-CN": "VS Code（text 图标）", "en": "VS Code (text icon)" },
          "description": { "zh-CN": "使用文字缩写作为图标", "en": "Text abbreviation as icon" },
          "url": "https://code.visualstudio.com",
          "icon": {
            "type": "text",
            "value": "VS",
            "bgColor": "#0078d4"
          }
        }
      ]
    }
  ]
}
```

---

## 图标类型选型建议

| 场景 | 推荐类型 |
|------|---------|
| 知名网站，有稳定 favicon | `url` |
| 自有品牌，有 SVG 设计稿 | `svg` |
| 快速搭建、原型验证 | `builtin`（Emoji） |
| 品牌字母缩写、中文单字 | `text` |
| `url` 图片加载失败的降级方案 | `builtin` 或 `text` |
