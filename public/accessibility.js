'use strict';
function setupVitaSafeControls(document) {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const dialog = $('#overlay');
  let dialogOpener = null;
  function modal(html) {
    if (!dialog.open) dialogOpener = document.activeElement;
    const content = $('#modalContent');
    content.innerHTML = html;
    $('#dialogStatus').textContent = '';
    const title = content.querySelector('h2,h3');
    if (title) {
      title.id = 'activeDialogTitle';
      dialog.setAttribute('aria-labelledby', title.id);
    } else dialog.removeAttribute('aria-labelledby');
    if (!dialog.open) dialog.showModal();
    const initial = Array.from(content.querySelectorAll('input:not([type="hidden"]):enabled')).find(el => el.getClientRects().length);
    (initial || $('#closeModal')).focus();
  }
  function close() {
    if (!dialog.open) return;
    dialog.close();
    $('#modalContent').replaceChildren();
    if (dialogOpener?.isConnected) dialogOpener.focus();
    dialogOpener = null;
  }
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const stops = Array.from(dialog.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]'))
      .filter(el => !el.matches(':disabled') && el.tabIndex >= 0 && el.getClientRects().length);
    const first = stops[0], last = stops.at(-1);
    if (!first) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  function setMenu(open) {
    $('#nav').classList.toggle('open', open);
    $('#menuBtn').setAttribute('aria-expanded', String(open));
  }
  $('#menuBtn').onclick = () => {
    const open = $('#menuBtn').getAttribute('aria-expanded') !== 'true';
    setMenu(open);
    if (open) $('#nav a')?.focus();
  };
  $$('#nav a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !dialog.open && $('#menuBtn').getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      $('#menuBtn').focus();
    }
  });
  document.defaultView.matchMedia('(max-width:900px)').addEventListener('change', () => setMenu(false));
  return {modal, close};
}
if (typeof module !== 'undefined' && module.exports) module.exports = setupVitaSafeControls;
