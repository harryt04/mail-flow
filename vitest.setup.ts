import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom doesn't implement HTMLMediaElement playback methods and logs a
// "Not implemented" warning on every call — stub them so tests that touch
// real <audio>/<video> elements (e.g. useAudioPlayback) stay quiet.
window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
window.HTMLMediaElement.prototype.pause = vi.fn()
window.HTMLMediaElement.prototype.load = vi.fn()

// Menu focus and popup transitions use browser APIs that jsdom does not model.
HTMLElement.prototype.showPopover ??= function () {}
HTMLElement.prototype.hidePopover ??= function () {}
Element.prototype.getAnimations ??= () => []
Element.prototype.scrollIntoView ??= function () {}
document.head.append(
  Object.assign(document.createElement('style'), {
    textContent: '[popover]:not([hidden]) { display: block !important }',
  }),
)
