





# Multron

> A multiboxed browser experience

Utilizes Electron's [BrowserView](https://www.electronjs.org/docs/latest/api/browser-view) to render multiple Chromium windows within the same window.

---

**Planned Features:**

 - [x] Dynamic layout editor w/ splitting, resizing, deletion
 - [x] Set URL per BrowserView
	 - [ ] Menu for user-input
 - [x] Set zoom per BrowserView
 - [ ] Support per-view user sessions
 - [ ] Save layout of tiles / URLs
 - [ ] Restore layout from file
 - [ ] General configuration menu & file

---

**Getting Started:**

- `npm install`
- `npm run dev`
	- `run-with-logviewplus.ps1` runs [LogViewPlus](https://www.logviewplus.com/) on the side and opens `log.txt` automatically. Requires `LogViewPlus.exe` in path.
	- `LogViewPlusSettings.xml` is included in the project root with an included parser.

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
- [pino](https://getpino.io/)