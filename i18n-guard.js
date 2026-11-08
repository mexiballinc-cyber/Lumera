// Avoid emitting MutationObserver records when i18n writes the same text-node
// value again. The legacy translation map can encounter already-translated
// text, so this makes those writes idempotent and prevents an observer loop.
const nodeValueDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'nodeValue');

if (nodeValueDescriptor?.get && nodeValueDescriptor?.set && nodeValueDescriptor.configurable) {
  Object.defineProperty(Node.prototype, 'nodeValue', {
    configurable: nodeValueDescriptor.configurable,
    enumerable: nodeValueDescriptor.enumerable,
    get: nodeValueDescriptor.get,
    set(value) {
      if (
        this.nodeType === Node.TEXT_NODE &&
        nodeValueDescriptor.get.call(this) === String(value ?? '')
      ) {
        return;
      }
      nodeValueDescriptor.set.call(this, value);
    }
  });
}

// Avoid replacing translated elements with identical textContent. Keep this
// narrow to explicitly translated elements so other DOM operations are intact.
const textContentDescriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');

if (textContentDescriptor?.get && textContentDescriptor?.set && textContentDescriptor.configurable) {
  Object.defineProperty(Node.prototype, 'textContent', {
    configurable: textContentDescriptor.configurable,
    enumerable: textContentDescriptor.enumerable,
    get: textContentDescriptor.get,
    set(value) {
      if (
        this.nodeType === Node.ELEMENT_NODE &&
        this.hasAttribute?.('data-i18n') &&
        textContentDescriptor.get.call(this) === String(value ?? '')
      ) {
        return;
      }
      textContentDescriptor.set.call(this, value);
    }
  });
}
