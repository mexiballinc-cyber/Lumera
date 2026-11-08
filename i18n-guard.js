// Prevent repeated textContent writes on translated labels from retriggering
// the global i18n MutationObserver indefinitely.
const nativeTextContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');

if (nativeTextContent?.get && nativeTextContent?.set) {
  Object.defineProperty(Node.prototype, 'textContent', {
    configurable: nativeTextContent.configurable,
    enumerable: nativeTextContent.enumerable,
    get: nativeTextContent.get,
    set(value) {
      if (
        this.nodeType === Node.ELEMENT_NODE &&
        this.hasAttribute?.('data-i18n') &&
        nativeTextContent.get.call(this) === String(value ?? '')
      ) {
        return;
      }
      nativeTextContent.set.call(this, value);
    }
  });
}
