function decorate(element) {
  if (!(element instanceof Element) || !element.matches('[data-tooltip]')) return;
  let tooltip = element.querySelector(':scope > .tooltip');
  if (!tooltip) {
    tooltip = document.createElement('span');
    tooltip.className = 'tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'true');
    element.appendChild(tooltip);
  }
  tooltip.textContent = element.dataset.tooltip;
}

export function initTooltips() {
  document.querySelectorAll('[data-tooltip]').forEach(decorate);
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') decorate(mutation.target);
      mutation.addedNodes.forEach((node) => {
        decorate(node);
        node.querySelectorAll?.('[data-tooltip]').forEach(decorate);
      });
    });
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-tooltip'],
  });
}