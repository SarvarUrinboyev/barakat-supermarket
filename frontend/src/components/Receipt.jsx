/**
 * Monospace 80mm receipt. The print stylesheet hides everything except
 * elements with the `receipt` class, so window.print() prints only this.
 */
export function Receipt({ text }) {
  return <div className="receipt">{text}</div>;
}
