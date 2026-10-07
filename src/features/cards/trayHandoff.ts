/**
 * The Choose screen unmounts when training starts, but the cards should fly from their tray slots into the training
 * feed. Choose records each slot's on-screen rect just before TRAIN; Training reads it (non-destructively, so React
 * StrictMode's double mount in dev still works).
 */
let rects = new Map<string, DOMRect>()

export function recordTrayRects(next: Map<string, DOMRect>) {
  rects = next
}

export function getTrayRects(): Map<string, DOMRect> {
  return rects
}

/** Read every filled tray slot's rect from the DOM, keyed by example id. */
export function captureTrayRects(root: ParentNode = document): Map<string, DOMRect> {
  const m = new Map<string, DOMRect>()
  root.querySelectorAll<HTMLElement>('.slot--filled[data-id]').forEach((el) => m.set(el.dataset.id!, el.getBoundingClientRect()))
  return m
}
