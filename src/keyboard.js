export const PANEL_SHORTCUTS = {
  KeyM: 'memories', KeyP: 'pets', KeyR: 'rituals', KeyJ: 'journal',
  KeyN: 'neighbors', KeyV: 'voice', KeyO: 'rooms', KeyH: 'help',
};

export const isTyping = element => element instanceof Element &&
  !!element.closest('input, textarea, select, [contenteditable="true"]');

// Number the primary choices, leaving secondary navigation and deletion on Tab.
export function prepareDialog(dialog, type) {
  const content = dialog.querySelector('#panel-content');
  const choices = [...content.querySelectorAll('.stack > button, [data-care], [data-topic], [data-room], [data-memory], [data-rest]')].slice(0, 9);
  choices.forEach((button, index) => {
    button.dataset.keyChoice = index + 1;
    button.setAttribute('aria-keyshortcuts', String(index + 1));
    const key = document.createElement('kbd');
    key.className = 'choice-key';
    key.textContent = index + 1;
    key.setAttribute('aria-hidden', 'true');
    button.prepend(key);
  });
  const target = type === 'memory' ? content.querySelector('video, [data-action="resume"]') : choices[0] || content.querySelector('button, input, select');
  target?.focus({preventScroll: true});
}

export function navigateDialog(event, dialog) {
  if (isTyping(event.target) || event.altKey || event.ctrlKey || event.metaKey) return false;
  const digit = event.code.match(/^(?:Digit|Numpad)([1-9])$/)?.[1];
  if (digit) {
    const button = dialog.querySelector(`[data-key-choice="${digit}"]`);
    if (button) {event.preventDefault(); button.click(); return true;}
  }
  if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
    const items = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, video[controls]')].filter(el => el.getClientRects().length);
    const index = items.indexOf(document.activeElement);
    const next = (index + (event.code === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    if (items[next]) {event.preventDefault(); items[next].focus(); return true;}
  }
  return false;
}
