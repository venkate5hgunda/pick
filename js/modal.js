export function initModalDismissal() {
  const modals = Array.from(document.querySelectorAll('.modal'));

  const close = (modal) => {
    modal.hidden = true;
    document.body.classList.toggle('has-modal', modals.some((item) => !item.hidden));
  };

  modals.forEach((modal) => {
    modal.addEventListener('pointerdown', (event) => {
      if (event.target === modal) close(modal);
    });
    modal.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => close(modal));
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openModal = [...modals].reverse().find((modal) => !modal.hidden);
    if (openModal) close(openModal);
  });
}