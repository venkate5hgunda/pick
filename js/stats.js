// Distribution tracking + canvas histogram rendering. Counting logic is pure
// and unit-tested; render() touches the DOM/canvas only.

export function createTracker(initialCounts = {}) {
  return { counts: { ...initialCounts }, total: Object.values(initialCounts).reduce((a, b) => a + b, 0) };
}

export function record(tracker, label) {
  tracker.counts[label] = (tracker.counts[label] || 0) + 1;
  tracker.total += 1;
  return tracker;
}

export function reset(tracker) {
  tracker.counts = {};
  tracker.total = 0;
  return tracker;
}

/** Returns [{ label, count, percent }] sorted by insertion/label order given. */
export function toRows(tracker, orderedLabels) {
  const labels = orderedLabels || Object.keys(tracker.counts);
  return labels.map((label) => {
    const count = tracker.counts[label] || 0;
    const percent = tracker.total > 0 ? (count / tracker.total) * 100 : 0;
    return { label, count, percent };
  });
}

/**
 * Draws a bar chart on `canvas` for the given rows. If `theoretical` (array of
 * 0..1 probabilities aligned to rows) is provided, overlays expected-percent
 * ticks for comparison (used by the Catan 2d6 histogram).
 */
export function renderHistogram(canvas, rows, { theoretical = null, barColor = '#3b82f6', theoryColor = '#ef4444' } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width || canvas.clientWidth || 300));
  const height = Math.max(1, Math.round(bounds.height || canvas.clientHeight || 220));
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (rows.length === 0) return;

  const styles = getComputedStyle(document.documentElement);
  const textColor = styles.getPropertyValue('--text').trim() || '#172036';
  const mutedColor = styles.getPropertyValue('--muted').trim() || '#657087';
  const gridColor = styles.getPropertyValue('--chart-grid').trim() || 'rgba(101,112,135,.2)';
  const rawMax = Math.max(10, ...rows.map((row) => row.percent), ...(theoretical ? theoretical.map((probability) => probability * 100) : [0]));
  const maxPercent = Math.ceil(rawMax / 5) * 5;
  const padding = { top: 25, right: 12, bottom: 34, left: 42 };
  const chartHeight = height - padding.top - padding.bottom;
  const barSlot = (width - padding.left - padding.right) / rows.length;
  const barWidth = Math.max(2, Math.min(52, barSlot * 0.68));

  ctx.font = '700 11px "Nunito Sans", sans-serif';
  ctx.textAlign = 'center';

  for (let line = 0; line <= 4; line += 1) {
    const value = maxPercent * (line / 4);
    const y = padding.top + chartHeight - chartHeight * (line / 4);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, y + 0.5);
    ctx.lineTo(width - padding.right, y + 0.5);
    ctx.stroke();
    ctx.fillStyle = mutedColor;
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(value)}%`, padding.left - 7, y + 4);
  }

  const labelStep = Math.max(1, Math.ceil(28 / barSlot));

  rows.forEach((row, i) => {
    const slotX = padding.left + i * barSlot + barSlot / 2;
    const barHeight = (row.percent / maxPercent) * chartHeight;
    const y = padding.top + (chartHeight - barHeight);

    ctx.fillStyle = barColor;
    ctx.beginPath();
    ctx.roundRect(slotX - barWidth / 2, y, barWidth, Math.max(row.count ? 2 : 0, barHeight), Math.min(5, barWidth / 2));
    ctx.fill();

    if (theoretical && theoretical[i] != null) {
      const theoryY = padding.top + (chartHeight - (theoretical[i] * 100 / maxPercent) * chartHeight);
      ctx.strokeStyle = theoryColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(slotX - barWidth / 2 - 2, theoryY);
      ctx.lineTo(slotX + barWidth / 2 + 2, theoryY);
      ctx.stroke();
    }

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    if (i % labelStep === 0) ctx.fillText(row.label, slotX, height - 11);
    if (barSlot >= 20 || row.count > 0) ctx.fillText(`${row.count}`, slotX, Math.max(11, y - 6));
  });
}

export class ResponsiveHistogram {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = options;
    this.rows = [];
    this.observer = new ResizeObserver(() => this.draw());
    this.observer.observe(canvas);
    window.addEventListener('pick:themechange', () => this.draw());
  }

  render(rows, options = {}) {
    this.rows = rows;
    this.options = { ...this.options, ...options };
    this.draw();
  }

  draw() {
    if (!this.canvas.hidden && this.canvas.clientWidth > 0) {
      renderHistogram(this.canvas, this.rows, this.options);
    }
  }
}
