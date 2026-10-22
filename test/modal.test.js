import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function setup(required = false) {
  const listeners = {};
  const document = { body: { style: {}, classList: { toggle() {} } } };
  class Element {
    constructor(parent = null) {
      this.parent = parent;
      this.hidden = false;
      this.inert = false;
      this.disabled = false;
      this.isConnected = true;
      this.children = [];
      this.dataset = {};
      this.listeners = {};
    }
    focus() { document.activeElement = this; }
    closest() {
      for (let node = this; node; node = node.parent) if (node.hidden || node.inert) return node;
      return null;
    }
    contains(target) { return target === this || this.children.some((child) => child.contains(target)); }
    getClientRects() { return [{}]; }
    querySelector() { return this.content; }
    querySelectorAll(selector) { return selector === '[data-close-modal]' ? [] : this.controls; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
  }
  const background = new Element();
  const trigger = new Element(background);
  background.children = [trigger];
  document.activeElement = trigger;
  const modal = new Element();
  modal.hidden = true;
  modal.dataset.dismissible = required ? 'false' : 'true';
  modal.content = new Element(modal);
  const first = new Element(modal.content);
  const last = new Element(modal.content);
  modal.content.children = [first, last];
  modal.children = [modal.content];
  modal.controls = [first, last];
  document.querySelectorAll = (selector) => selector === '.modal' ? [modal] : [background];
  document.addEventListener = (name, listener) => { listeners[name] = listener; };
  const source = readFileSync(new URL('../js/modal.js', import.meta.url), 'utf8').replace(/^export /gm, '');
  const context = { document };
  runInNewContext(source + '\nthis.api = { openModal, closeModal, initModalDismissal };', context);
  context.api.initModalDismissal();
  const key = (key, shiftKey = false) => {
    let prevented = false;
    listeners.keydown({ key, shiftKey, preventDefault: () => { prevented = true; } });
    return prevented;
  };
  return { ...context.api, document, modal, background, trigger, first, last, key, listeners };
}

test('dialogs receive focus, keep Tab inside, and restore focus on Escape', () => {
  const h = setup();
  h.openModal(h.modal);
  assert.equal(h.document.activeElement, h.first);
  assert.equal(h.background.inert, true);
  h.last.focus();
  assert.equal(h.key('Tab'), true);
  assert.equal(h.document.activeElement, h.first);
  assert.equal(h.key('Tab', true), true);
  assert.equal(h.document.activeElement, h.last);
  h.key('Escape');
  assert.equal(h.modal.hidden, true);
  assert.equal(h.background.inert, false);
  assert.equal(h.document.activeElement, h.trigger);
});

test('required settlement dialog stays open on Escape and backdrop clicks', () => {
  const h = setup(true);
  h.openModal(h.modal);
  h.key('Escape');
  h.modal.listeners.pointerdown({ target: h.modal });
  assert.equal(h.modal.hidden, false);
  assert.equal(h.background.inert, true);
  h.closeModal(h.modal);
  assert.equal(h.modal.hidden, true);
});

test('attempted focus outside an open dialog returns to its first control', () => {
  const h = setup();
  h.openModal(h.modal);
  h.trigger.focus();
  h.listeners.focusin({ target: h.trigger });
  assert.equal(h.document.activeElement, h.first);
});
