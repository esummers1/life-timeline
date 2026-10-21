# Life Timeline

See the overlapping chapters of your life (homes, jobs, cars, …) as swimlanes on one scrolling timeline.

```bash
npm install
npm run dev
```

- **Add items** with "+ Add item", the + on a lane, or by double-clicking an empty spot in a lane. Click an item to edit or delete it.
- **Lanes** are renamed by clicking their name and reordered with the ▲▼ buttons (or Alt+↑/↓ while editing the name); "+ Add lane" adds one. Overlapping items in a lane stack into extra rows.
- **Hover** anywhere on the timeline to see your age, the season and everything active at that moment in the bar at the bottom.
- **Zoom** with the slider or pinch / ctrl+scroll. A vertical mouse wheel scrolls through time.
- **Data** autosaves to this browser's local storage. Use Export / Import to save to and restore from a JSON file. `examples/sample-timeline.json` is a sample to import.

`npm test` runs the unit tests; `npm run build` type-checks and builds to `dist/`.
# life-timeline
