import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// findBy…/waitFor wait up to 3 s (default 1 s) for what a test expects to appear: a
// slow or busy machine (a Docker build, the first run after a change) may render the
// home page in more than a second. Waiting longer never makes a wrong result pass.
configure({ asyncUtilTimeout: 3000 });

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
