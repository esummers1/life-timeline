import { useEffect, useState, type CSSProperties } from 'react';
import { MONTH_NAMES, parseMonthKey, splitMonthIndex, toMonthKey } from '../model/months';
import { COLOR_KEYS, PALETTE } from '../model/palette';
import type { Category, LifeItem, MonthKey } from '../model/types';
import { useModalDialog } from './useModalDialog';

interface ItemDialogProps {
  item: LifeItem;
  isNew: boolean;
  categories: Category[];
  onSave(item: LifeItem): void;
  onDelete(itemId: string): void;
  onClose(): void;
}

/**
 * Modal form for adding or editing an item. Edits are held locally and only
 * passed to `onSave` on submit; Escape, Cancel, or clicking the backdrop discards them.
 */
export function ItemDialog({ item: initialItem, isNew, categories, onSave, onDelete, onClose }: ItemDialogProps) {
  const { dialogProps, close } = useModalDialog(onClose);
  const [item, setItem] = useState(initialItem);

  const isEndBeforeStart = item.end !== null && parseMonthKey(item.end)! < parseMonthKey(item.start)!;
  const canSave = item.label.trim() !== '' && !isEndBeforeStart;
  const update = (changes: Partial<LifeItem>) => setItem((current) => ({ ...current, ...changes }));

  return (
    <dialog className="dialog" {...dialogProps}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          const notes = item.notes?.trim();
          onSave({ ...item, label: item.label.trim(), notes: notes || undefined });
        }}
      >
        <h2>{isNew ? 'Add to timeline' : 'Edit item'}</h2>

        <label className="field">
          <span>Label</span>
          <input
            autoFocus
            value={item.label}
            placeholder="e.g. Flat on Mill Street"
            onChange={(event) => update({ label: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Lane</span>
          <select value={item.categoryId} onChange={(event) => update({ categoryId: event.target.value })}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name || 'Untitled lane'}</option>
            ))}
          </select>
        </label>

        <div className="field-row">
          <div className="field">
            <span>From</span>
            <MonthPicker value={item.start} onChange={(start) => update({ start })} />
          </div>
          <div className="field">
            <span>To</span>
            <MonthPicker value={item.end ?? item.start} disabled={item.end === null} onChange={(end) => update({ end })} />
            <label className="checkbox">
              <input
                type="checkbox"
                checked={item.end === null}
                onChange={(event) => update({ end: event.target.checked ? null : item.start })}
              />
              Ongoing
            </label>
          </div>
        </div>
        {isEndBeforeStart && <p className="field-error">The end month is before the start month.</p>}

        <fieldset className="field">
          <span>Colour</span>
          <div className="swatches">
            {COLOR_KEYS.map((color) => (
              <label key={color} className="swatch" style={{ '--item-color': PALETTE[color] } as CSSProperties} title={color}>
                <input
                  type="radio"
                  name="color"
                  value={color}
                  checked={item.color === color}
                  onChange={() => update({ color })}
                />
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>Notes</span>
          <textarea rows={3} value={item.notes ?? ''} onChange={(event) => update({ notes: event.target.value })} />
        </label>

        <footer className="dialog-actions">
          {!isNew && (
            <button type="button" className="button danger" onClick={() => onDelete(item.id)}>Delete</button>
          )}
          <span className="spacer" />
          <button type="button" className="button" onClick={close}>Cancel</button>
          <button type="submit" className="button primary" disabled={!canSave}>Save</button>
        </footer>
      </form>
    </dialog>
  );
}

/**
 * Month + year selector. Native `<input type="month">` isn't supported in desktop
 * Safari, so this composes a select and a number input. The year is edited as free
 * text and only reported once it's a plausible four-digit year.
 */
function MonthPicker({ value, disabled, onChange }: { value: MonthKey; disabled?: boolean; onChange(value: MonthKey): void }) {
  const { year, month } = splitMonthIndex(parseMonthKey(value) ?? 0);
  const [yearText, setYearText] = useState(String(year));

  useEffect(() => setYearText(String(year)), [year]);

  return (
    <div className="month-picker">
      <select
        value={month}
        disabled={disabled}
        aria-label="Month"
        onChange={(event) => onChange(toMonthKey(year * 12 + Number(event.target.value)))}
      >
        {MONTH_NAMES.map((name, index) => <option key={name} value={index}>{name}</option>)}
      </select>
      <input
        type="number"
        min={1900}
        max={2200}
        value={yearText}
        disabled={disabled}
        aria-label="Year"
        onChange={(event) => {
          setYearText(event.target.value);
          const typedYear = Number(event.target.value);
          if (/^\d{4}$/.test(event.target.value)) onChange(toMonthKey(typedYear * 12 + month));
        }}
        onBlur={() => setYearText(String(year))}
      />
    </div>
  );
}
