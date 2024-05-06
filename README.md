






# Multron

> A multiboxed browser experience

Utilizes Electron's [WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view) to render multiple Chromium windows within the same window (<ins>mul</ins>tiboxed Elec<ins>tron</ins>).

---

**Planned Features:**

 - [x] Dynamic layout editor w/ splitting, resizing, deletion
 - [x] Zoom capability
 - [ ] Pie menu on right click
	 - [ ] Load layouts
	 - [ ] Set URL
	 - [ ] Split
	 - [ ] Delete
	 - [ ] Pop-out
	 - [ ] Customization functionality
 - [ ] Modal for setting URL (with speed-dial)
 - [ ] Ability to pop-out a tile into a normal browser window
 - [ ] Drag views between different tiles
 - [ ] Open URL by dragging in any link source
 - [ ] Support per-view user sessions
 - [ ] Save layout of tiles / URLs
 - [ ] Restore layout from file
 - [ ] Settings menu

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