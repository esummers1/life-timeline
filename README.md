# 🗓️ Life Timeline

A small web app for seeing the overlapping parts of your life (where you lived, where you worked, what you drove) side by side on one timeline, so you can look at any moment and see how it all fitted together.

Each kind of thing gets its own swimlane. Time scrolls horizontally, with years, months and seasons along the top, and a dotted line marks each of your birthdays.

## 🚀 Getting started

You'll need Node.js. Then:

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

To see what a filled-in timeline looks like, click Import and choose `examples/sample-timeline.json`.

## 🧭 Using it

- Set your birthday in the toolbar to get birthday lines and ages.
- Add something with the "+ Add item" button, the + on a lane, or by double-clicking an empty spot in a lane. Give it a label, a start and end month (or mark it as ongoing) and a colour.
- Click an item to edit or delete it.
- Click a lane's name to rename it. The arrows next to it move the lane up or down, as does Alt+Up/Down while you're editing the name. "+ Add lane" adds a new one.
- Items in the same lane that overlap are stacked onto extra rows.
- Hover over the timeline to see, in the bar at the bottom, the date, your age and everything that was going on at that moment.
- Zoom with the slider or by pinching (or Ctrl+scroll). Fully zoomed out, the whole timeline fits the window.
- The theme button switches between automatic, light and dark mode.

## 💾 Saving your data

Everything is saved automatically in your browser's local storage, so it will still be there when you come back. That storage belongs to one browser on one machine, though, so use Export to save a JSON file as a backup or to move to another browser, and Import to load one back in.

## 🛠️ Development

The app is built with React, TypeScript and Vite, and has no backend.

```bash
npm test        # run the unit tests
npm run build   # type-check and build to dist/
```

The timeline logic (dates, ages, lane stacking, file validation) lives in `src/model`, and the UI in `src/components`.
