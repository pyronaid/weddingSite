import '@testing-library/jest-dom/vitest';

// jsdom has no <dialog> methods yet: a minimal stand-in (open attribute + close event).
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

// Each test starts in English, whatever language the previous one switched to.
import { setLanguage } from '../i18n';
afterEach(() => setLanguage('en'));
