const previousFocus = new WeakMap();
let modalStack = [];

const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableElements(modal) {
  return [...modal.querySelectorAll(focusableSelector)]
    .filter((element) => !element.closest('[hidden], [inert]') && element.getClientRects().length);
}

function focusModal(modal) {
  const content = modal.querySelector('.modal-content');
  (focusableElements(modal)[0] || content)?.focus();
}

function syncModalState() {
  modalStack = modalStack.filter((modal) => !modal.hidden);
  const top = modalStack.at(-1);
  document.querySelectorAll('.app-header, .tabs, main, .app-footer').forEach((element) => {
    element.inert = Boolean(top);
  });
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.inert = Boolean(top && modal !== top);
  });
  document.body.classList.toggle('has-modal', Boolean(top));
  document.body.style.overflow = top ? 'hidden' : '';
}

export function openModal(modal) {
  if (!modal.hidden && modalStack.includes(modal)) return;
  previousFocus.set(modal, document.activeElement);
  modal.hidden = false;
  modalStack = modalStack.filter((item) => item !== modal);
  modalStack.push(modal);
  syncModalState();
  focusModal(modal);
}

export function closeModal(modal) {
  if (modal.hidden) return;
  const wasTop = modalStack.at(-1) === modal;
  modal.hidden = true;
  syncModalState();
  if (!wasTop) return;
  const target = previousFocus.get(modal);
  if (target?.isConnected && !target.disabled && !target.closest('[hidden], [inert]')) target.focus();
  else if (modalStack.length) focusModal(modalStack.at(-1));
}

export function initModalDismissal() {
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('pointerdown', (event) => {
      if (event.target === modal && modal.dataset.dismissible !== 'false') closeModal(modal);
    });
    modal.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => closeModal(modal));
    });
  });

  document.addEventListener('keydown', (event) => {
    const top = modalStack.at(-1);
    if (!top) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (top.dataset.dismissible !== 'false') closeModal(top);
    } else if (event.key === 'Tab') {
      const controls = focusableElements(top);
      if (!controls.length) { event.preventDefault(); focusModal(top); return; }
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  document.addEventListener('focusin', (event) => {
    const top = modalStack.at(-1);
    if (top && !top.contains(event.target)) focusModal(top);
  });
}
