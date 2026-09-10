const CONFETTI_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ffffff'];

export function summarizeBatchResults(results, segments) {
  const byLabel = new Map();
  results.forEach((segmentIndex) => {
    const segment = segments[segmentIndex];
    if (!segment) return;
    const current = byLabel.get(segment.label) || { label: segment.label, color: segment.color, count: 0 };
    current.count += 1;
    byLabel.set(segment.label, current);
  });
  const total = Array.from(byLabel.values()).reduce((sum, row) => sum + row.count, 0);
  const rows = Array.from(byLabel.values())
    .map((row) => ({ ...row, percent: total ? row.count / total * 100 : 0 }))
    .sort((left, right) => right.count - left.count);
  const highestCount = rows[0]?.count || 0;
  const leaders = rows.filter((row) => row.count === highestCount);
  return { total, rows, dominant: leaders.length === 1 ? leaders[0] : null };
}

export class BatchResultOverlay {
  constructor(overlay) {
    this.overlay = overlay;
    this.eyebrow = overlay.querySelector('[data-batch-eyebrow]');
    this.heading = overlay.querySelector('[data-batch-heading]');
    this.stats = overlay.querySelector('[data-batch-stats]');
    overlay.querySelector('[data-result-dismiss]')?.addEventListener('click', () => this.hide());
  }

  show(summary, context = 'Animated batch') {
    this.hide();
    const { dominant } = summary;
    this.eyebrow.textContent = `${context} · ${summary.total} runs`;
    this.heading.textContent = dominant?.label || 'No clear winner';
    if (dominant) this.overlay.style.setProperty('--result-accent', dominant.color);
    else this.overlay.style.removeProperty('--result-accent');

    const fragment = document.createDocumentFragment();
    summary.rows.forEach((row) => {
      const item = document.createElement('div');
      item.className = `batch-result-row${row === dominant ? ' is-dominant' : ''}`;
      item.style.setProperty('--row-accent', row.color);
      item.style.setProperty('--row-percent', `${row.percent}%`);
      const label = document.createElement('span');
      label.textContent = row.label;
      const value = document.createElement('strong');
      value.textContent = `${row.count} · ${row.percent.toFixed(1)}%`;
      item.append(label, value);
      fragment.appendChild(item);
    });
    this.stats.replaceChildren(fragment);
    this.overlay.hidden = false;
    requestAnimationFrame(() => this.overlay.classList.add('is-visible'));
  }

  hide() {
    this.overlay.classList.remove('is-visible');
    this.overlay.hidden = true;
  }
}

export class WheelCelebration {
  constructor(stage, overlay) {
    this.stage = stage;
    this.overlay = overlay;
    this.label = overlay.querySelector('[data-result-label]');
    this.confetti = overlay.previousElementSibling;
    this.cleanupTimer = null;
    overlay.querySelector('[data-result-dismiss]')?.addEventListener('click', () => this.hide());
  }

  show(label, accentColor) {
    this.hide();
    this.label.textContent = label;
    this.overlay.style.setProperty('--result-accent', accentColor);
    this.overlay.hidden = false;
    requestAnimationFrame(() => this.overlay.classList.add('is-visible'));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) this.releaseConfetti(accentColor);
  }

  hide() {
    clearTimeout(this.cleanupTimer);
    this.overlay.classList.remove('is-visible');
    this.overlay.hidden = true;
    this.confetti.replaceChildren();
  }

  releaseConfetti(accentColor) {
    const fragment = document.createDocumentFragment();
    const colors = [accentColor, ...CONFETTI_COLORS];
    for (let index = 0; index < 54; index += 1) {
      const piece = document.createElement('i');
      const angle = Math.random() * Math.PI * 2;
      const distance = 90 + Math.random() * 170;
      piece.className = 'confetti-piece';
      piece.style.setProperty('--confetti-color', colors[index % colors.length]);
      piece.style.setProperty('--confetti-x', `${Math.cos(angle) * distance}px`);
      piece.style.setProperty('--confetti-y', `${Math.sin(angle) * distance - 45}px`);
      piece.style.setProperty('--confetti-fall', `${120 + Math.random() * 170}px`);
      piece.style.setProperty('--confetti-turn', `${360 + Math.random() * 720}deg`);
      piece.style.setProperty('--confetti-delay', `${Math.random() * 120}ms`);
      piece.style.setProperty('--confetti-duration', `${900 + Math.random() * 650}ms`);
      fragment.appendChild(piece);
    }
    this.confetti.appendChild(fragment);
    this.cleanupTimer = setTimeout(() => this.confetti.replaceChildren(), 1900);
  }
}