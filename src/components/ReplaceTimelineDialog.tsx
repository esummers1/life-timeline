import { useState } from 'react';
import { useModalDialog } from './useModalDialog';

interface ReplaceTimelineDialogProps {
  title: string;
  confirmLabel: string;
  itemCount: number;
  onExport(): void;
  onConfirm(): void;
  onClose(): void;
}

/**
 * Confirms replacing the current timeline (with a sample, a blank timeline, or an
 * imported file), offering to export a copy first since the replacement can't be
 * undone. Exporting leaves the dialog open so the user can then go ahead.
 */
export function ReplaceTimelineDialog({ title, confirmLabel, itemCount, onExport, onConfirm, onClose }: ReplaceTimelineDialogProps) {
  const { dialogProps, close } = useModalDialog(onClose);
  const [hasExported, setHasExported] = useState(false);

  return (
    <dialog className="dialog" aria-labelledby="replace-timeline-title" {...dialogProps}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <h2 id="replace-timeline-title">{title}</h2>
        <p className="dialog-text">
          {itemCount > 0
            ? `This replaces everything on your timeline, including its ${itemCount} ${itemCount === 1 ? 'item' : 'items'}, and can’t be undone.`
            : 'This replaces everything on your timeline, and can’t be undone.'}
          {' '}To keep a copy, export it first; you can import it again later.
        </p>
        <footer className="dialog-actions">
          <button
            type="button"
            className="button"
            disabled={hasExported}
            onClick={() => {
              onExport();
              setHasExported(true);
            }}
          >
            {hasExported ? 'Exported ✓' : 'Export a copy'}
          </button>
          <span className="spacer" />
          <button type="button" className="button" onClick={close}>Cancel</button>
          <button type="submit" className="button primary" autoFocus>{confirmLabel}</button>
        </footer>
      </form>
    </dialog>
  );
}
