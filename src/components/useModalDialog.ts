import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';

/**
 * Wires a `<dialog>` up as a modal: it opens on mount, and `onClose` runs when it
 * closes by any route (Escape, `close()`, or a click on the backdrop). A backdrop
 * click only counts if the press also started on the backdrop, so a text selection
 * dragged out of a field doesn't close it. Spread `dialogProps` onto the `<dialog>`.
 */
export function useModalDialog(onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdropRef = useRef(false);

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal();
  }, []);

  const close = () => dialogRef.current?.close();
  const dialogProps = {
    ref: dialogRef,
    onClose,
    onPointerDown: (event: PointerEvent) => {
      pressStartedOnBackdropRef.current = event.target === dialogRef.current;
    },
    onClick: (event: MouseEvent) => {
      if (pressStartedOnBackdropRef.current && event.target === dialogRef.current) close();
    },
  };
  return { dialogProps, close };
}
