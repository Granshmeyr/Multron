# Multron

> A multiboxed browser experience

Utilizes Electron's [WebContentsView](https://www.electronjs.org/docs/latest/api/web-contents-view) to render multiple Chromium windows within the same window (<ins>mul</ins>tiboxed Elec<ins>tron</ins>).

---

**Planned Features:**

 - [x] Dynamic layout editor w/ splitting, resizing, deletion
 - [x] Zoom capability
 - [x] Pie menu on right click
	 - [ ] Load layouts
	 - [ ] Set URL
	 - [x] Split
	 - [x] Delete
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

---

**Technologies:**

- Vite
	- React
	- Typescript
- Tailwind
- Electron
- [electron-vite](https://electron-vite.org/)