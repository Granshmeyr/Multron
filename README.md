


# MultronView

> A multiboxed browser experience (📦)

Utilizes Electron's [BrowserView](https://www.electronjs.org/docs/latest/api/browser-view) to render multiple Chromium instances within the same window.

---

**Planned Features:**

 - [x] Dynamic layout editor w/ splitting, resizing 
 - [ ] Set URL per BrowserView
 - [ ] Set zoom per BrowserView
 - [ ] Support per-view user sessions
 - [ ] Save layout of tiles / URLs
 - [ ] Restore layout from file

---

**Getting Started:**

- `npm install`
- `npm run dev` or `.\run-dev.ps1`

---

**Issues:**

The BrowserViews are unresponsive in their geometry updates when resizing a lot at once. Not sure how to fix this currently.

---

**Technologies:**

- Vite
	- React
	- Typescript
- Tailwind
- Electron
- [electron-vite](https://electron-vite.org/)
