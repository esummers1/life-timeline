import { useEffect, useRef, useState } from 'react';
import { ItemDialog } from './components/ItemDialog';
import { Snapshot } from './components/Snapshot';
import { MAX_PX_PER_MONTH, MIN_PX_PER_MONTH, Timeline } from './components/Timeline';
import { moveCategory } from './model/categories';
import { monthIndexOfDate, positionOfDate, toMonthKey } from './model/months';
import { suggestColor } from './model/palette';
import { createDefaultTimeline, loadTimeline, parseTimeline, saveTimeline } from './model/storage';
import type { LifeItem, TimelineData } from './model/types';

type ThemePreference = 'system' | 'light' | 'dark';
const THEME_STORAGE_KEY = 'life-timeline:theme';
const THEME_ORDER: ThemePreference[] = ['system', 'light', 'dark'];

export function App() {
  const [data, setData] = useState<TimelineData>(() => loadTimeline() ?? createDefaultTimeline());
  const [nowMonth] = useState(() => monthIndexOfDate(new Date()));
  const [pxPerMonth, setPxPerMonth] = useState(14);
  const [minPxPerMonth, setMinPxPerMonth] = useState(MIN_PX_PER_MONTH);
  // Zooming fully out stores the hard floor, so the view keeps fitting the window as it resizes.
  const effectivePxPerMonth = Math.max(pxPerMonth, minPxPerMonth);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ item: LifeItem; isNew: boolean } | null>(null);
  const [focusCategoryId, setFocusCategoryId] = useState<string | null>(null);
  const [theme, setTheme] = useThemePreference();
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveTimeline(data), [data]);

  const createItem = (categoryId: string, monthIndex: number) => {
    const month = toMonthKey(monthIndex);
    setEditing({
      isNew: true,
      item: {
        id: crypto.randomUUID(),
        categoryId,
        label: '',
        start: month,
        end: month,
        color: suggestColor(data.items, categoryId),
      },
    });
  };

  const saveItem = (item: LifeItem) => {
    setData((current) => ({
      ...current,
      items: current.items.some((existing) => existing.id === item.id)
        ? current.items.map((existing) => (existing.id === item.id ? item : existing))
        : [...current.items, item],
    }));
    setEditing(null);
  };

  const deleteItem = (itemId: string) => {
    setData((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }));
    setEditing(null);
  };

  const addCategory = () => {
    const category = { id: crypto.randomUUID(), name: '' };
    setData((current) => ({ ...current, categories: [...current.categories, category] }));
    setFocusCategoryId(category.id);
  };

  const renameCategory = (categoryId: string, name: string) => {
    setData((current) => ({
      ...current,
      categories: current.categories.map((category) => (category.id === categoryId ? { ...category, name } : category)),
    }));
  };

  const reorderCategory = (categoryId: string, offset: number) => {
    setData((current) => ({ ...current, categories: moveCategory(current.categories, categoryId, offset) }));
  };

  const deleteCategory = (categoryId: string) => {
    const category = data.categories.find((candidate) => candidate.id === categoryId);
    const itemCount = data.items.filter((item) => item.categoryId === categoryId).length;
    if (itemCount > 0 && !confirm(`Delete "${category?.name || 'Untitled lane'}" and its ${itemCount} item(s)?`)) return;
    setData((current) => ({
      ...current,
      categories: current.categories.filter((candidate) => candidate.id !== categoryId),
      items: current.items.filter((item) => item.categoryId !== categoryId),
    }));
  };

  const exportTimeline = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `life-timeline-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href));
  };

  const importTimeline = async (file: File) => {
    try {
      const imported = parseTimeline(JSON.parse(await file.text()));
      if (data.items.length === 0 || confirm('Replace your current timeline with the imported one?')) {
        setData(imported);
      }
    } catch (error) {
      alert(`Couldn’t import ${file.name}: ${error instanceof Error ? error.message : error}`);
    }
  };

  return (
    <div className="app">
      <header className="toolbar">
        <h1 className="brand">Life Timeline</h1>
        <label className="toolbar-field">
          <span>Birthday</span>
          <input
            type="date"
            value={data.birthday ?? ''}
            onChange={(event) => setData((current) => ({ ...current, birthday: event.target.value || null }))}
          />
        </label>
        <label className="toolbar-field">
          <span>Zoom</span>
          <input
            type="range"
            min={Math.log(minPxPerMonth)}
            max={Math.log(MAX_PX_PER_MONTH)}
            step={0.01}
            value={Math.log(effectivePxPerMonth)}
            onChange={(event) => {
              const isFullyZoomedOut = Number(event.target.value) <= Number(event.target.min);
              setPxPerMonth(isFullyZoomedOut ? MIN_PX_PER_MONTH : Math.exp(Number(event.target.value)));
            }}
          />
        </label>
        <span className="spacer" />
        <button
          className="button primary"
          disabled={data.categories.length === 0}
          onClick={() => createItem(data.categories[0].id, nowMonth)}
        >
          + Add item
        </button>
        <button className="button" onClick={() => importInputRef.current?.click()}>Import</button>
        <button className="button" onClick={exportTimeline}>Export</button>
        <button
          className="button theme-button"
          title={`Theme: ${theme}`}
          onClick={() => setTheme(THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length])}
        >
          {theme === 'system' ? '◐ Auto' : theme === 'light' ? '☀︎ Light' : '☾ Dark'}
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importTimeline(file);
            event.target.value = '';
          }}
        />
      </header>

      <Timeline
        data={data}
        nowMonth={nowMonth}
        pxPerMonth={effectivePxPerMonth}
        hoverPosition={hoverPosition}
        focusCategoryId={focusCategoryId}
        onPxPerMonthChange={setPxPerMonth}
        onMinPxPerMonthChange={setMinPxPerMonth}
        onHoverPositionChange={setHoverPosition}
        onItemClick={(item) => setEditing({ item, isNew: false })}
        onCreateItem={createItem}
        onCategoryRename={renameCategory}
        onCategoryDelete={deleteCategory}
        onCategoryMove={reorderCategory}
        onCategoryAdd={addCategory}
      />

      <Snapshot
        data={data}
        position={hoverPosition ?? positionOfDate(new Date())}
        isToday={hoverPosition === null}
        nowMonth={nowMonth}
      />

      {editing && (
        <ItemDialog
          key={editing.item.id}
          item={editing.item}
          isNew={editing.isNew}
          categories={data.categories}
          onSave={saveItem}
          onDelete={deleteItem}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/** The user's light/dark preference, persisted locally and applied as `data-theme` on the root element. */
function useThemePreference(): [ThemePreference, (theme: ThemePreference) => void] {
  const [theme, setTheme] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return THEME_ORDER.includes(saved as ThemePreference) ? (saved as ThemePreference) : 'system';
    } catch {
      return 'system';
    }
  });

  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Not persisting the theme is harmless.
    }
  }, [theme]);

  return [theme, setTheme];
}
