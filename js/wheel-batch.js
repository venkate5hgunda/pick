import { runMiniWheelBatch } from './wheel.js?v=8';

export class WheelBatchOverlay {
  constructor({ stage, mainElement, pointer, grid, status }) {
    this.stage = stage;
    this.mainElement = mainElement;
    this.pointer = pointer;
    this.grid = grid;
    this.status = status;
  }

  show(count) {
    this.stage.classList.add('is-batch-mode');
    this.stage.setAttribute('aria-busy', 'true');
    this.mainElement.hidden = true;
    this.pointer.hidden = true;
    this.grid.hidden = false;
    this.status.hidden = false;
    this.status.textContent = `${count} wheels spinning in parallel`;
  }

  hide() {
    this.stage.classList.remove('is-batch-mode');
    this.stage.removeAttribute('aria-busy');
    this.grid.hidden = true;
    this.grid.replaceChildren();
    this.status.hidden = true;
    this.mainElement.hidden = false;
    this.pointer.hidden = false;
  }

  async run(segments, count, options) {
    this.show(count);
    const results = await runMiniWheelBatch(this.grid, segments, count, options);
    this.status.textContent = `${count} wheels settled`;
    return results;
  }
}