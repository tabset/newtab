<div align="center">

# ✦ NewTab

**Расширение Chrome, которое делает каждую новую вкладку особенной**

[English](./README.md) · [简体中文](./README.zh-CN.md) · [繁體中文](./README.zh-TW.md) · [日本語](./README.ja.md) · [한국어](./README.ko.md) · Русский

<img src="https://github.com/tabset/newtab/blob/main/public/screenshot/home.png" alt="Главный экран" />

</div>

---

## Скриншоты

<table>
  <tr>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/builtin.png" alt="Встроенные вкладки" /></td>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/bookmark.png" alt="Менеджер закладок" /></td>
  </tr>
  <tr>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/background.png" alt="Настройки фона" /></td>
    <td><img src="https://github.com/tabset/newtab/blob/main/public/screenshot/bookmark_new.png" alt="Новая закладка" /></td>
  </tr>
</table>

---

## Возможности

### 🚀 Dock
- Четыре позиции: снизу, сверху, слева, справа
- Плавное увеличение иконок при наведении (регулируемые размер и радиус)
- Сортировка перетаскиванием, контекстное меню по правому клику

### 🔖 Менеджер закладок
- 4 типа иконок: фавикон, SVG, Emoji, текст
- Произвольный цвет фона иконки (сплошной / градиент)
- Управление категориями, виды «сетка» и «список»
- Режим массового управления: выбор нескольких, массовое удаление, добавление в Dock
- `Cmd/Ctrl + D`: мгновенное сохранение текущей страницы, уведомление при дубликате

### 🖼️ Система фонов
- Три типа: сплошной цвет, градиент, изображение (URL / API)
- Регулировка размытия и прозрачности в реальном времени
- Авторотация по расписанию (5 мин — раз в месяц)

### 🔍 Поиск
- 9 встроенных поисковых систем: Google, Bing, Baidu, GitHub и другие
- Фильтрация локальных закладок в реальном времени, переключение онлайн / локально

### 🌐 Языки
简体中文 · 繁體中文 · English · 日本語 · 한국어 · Русский

---

## Установка

### Из Chrome Web Store (рекомендуется)

Найдите **NewTab** в [Chrome Web Store](https://chrome.google.com/webstore) и нажмите «Установить».

### Ручная установка

1. Перейдите в [Releases](https://github.com/tabset/newtab/releases), скачайте последний `newtab.zip` и распакуйте его.  
   (Или клонируйте репозиторий и соберите самостоятельно: `npm install && npm run build`, результат в папке `dist`)
2. Откройте Chrome и перейдите по адресу `chrome://extensions`
3. Включите **Режим разработчика** (переключатель в правом верхнем углу)
4. Нажмите «Загрузить распакованное расширение» и выберите распакованную папку (или `dist`)

---

## Технологии

React · TypeScript · Vite · Framer Motion · Manifest V3

---

## License

[MIT](./LICENSE)
