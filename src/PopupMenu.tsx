import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDismiss } from "./hooks";

export type MenuItem = { key: string; label: ReactNode; current?: boolean; onSelect: () => void };

type Props = {
  /** The menu's accessible name. */
  label: string;
  /** The trigger button's text, and its accessible name if the text alone isn't one. */
  trigger: { text: ReactNode; ariaLabel?: string; className: string };
  items: MenuItem[];
  className?: string;
};

/** A small pop-up menu (the header's ☰ Questions, a card's ⋯). Opening it focuses the current or first item; ↑ ↓
 * Home End move between items; Escape, choosing an item or a click outside closes it, returning focus to the
 * trigger. While it's open the deck's ← → keys don't act (see InterviewScreen). */
export function PopupMenu({ label, trigger, items, className }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) button.current?.focus();
  };
  useDismiss(open, root, () => close(false));

  useEffect(() => {
    if (!open) return;
    const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    (buttons.find((b) => b.getAttribute("aria-current") === "true") ?? buttons[0])?.focus();
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent) {
    const buttons = [...(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: buttons.length - 1 }[e.key];
    if (e.key === "Escape") close(true);
    if (to === undefined) return;
    e.preventDefault();
    buttons[(to + buttons.length) % buttons.length]?.focus();
  }

  return (
    <div className={`popup ${className ?? ""}`} ref={root}>
      <button
        ref={button}
        type="button"
        className={trigger.className}
        aria-label={trigger.ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger.text}
      </button>
      {open && (
        <div className="popup-list" role="menu" aria-label={label} onKeyDown={onKeyDown}>
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              className="menu-item"
              aria-current={item.current ? "true" : undefined}
              onClick={() => {
                close(true);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
