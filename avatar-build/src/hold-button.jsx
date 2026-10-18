import React from 'react';
import { createRoot } from 'react-dom/client';
import HoldButton from './HoldButton.jsx';

const roots = new WeakMap();

window.NexoraHoldButton = {
  mount(element, props) {
    let root = roots.get(element);
    if (!root) {
      root = createRoot(element);
      roots.set(element, root);
    }
    root.render(React.createElement(HoldButton, props));
  },
  unmount(element) {
    const root = roots.get(element);
    if (!root) return;
    root.unmount();
    roots.delete(element);
  },
};
