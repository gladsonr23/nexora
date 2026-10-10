import React from 'react';
import { createRoot } from 'react-dom/client';
import GlideSelect from './GlideSelect.jsx';

const roots = new WeakMap();

window.NexoraGlideSelect = {
  mount(element, props) {
    let root = roots.get(element);
    if (!root) {
      root = createRoot(element);
      roots.set(element, root);
    }
    root.render(React.createElement(GlideSelect, props));
  },
  unmount(element) {
    const root = roots.get(element);
    if (!root) return;
    root.unmount();
    roots.delete(element);
  }
};
