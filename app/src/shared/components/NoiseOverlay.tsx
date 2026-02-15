/**
 * NoiseOverlay — Renders the SVG fractal noise texture that sits over the entire app.
 * Should be placed once at the root level (App.tsx or main.tsx).
 * Pure CSS class — no JS overhead.
 */
export function NoiseOverlay() {
  return <div className="noise-overlay" aria-hidden="true" />;
}
