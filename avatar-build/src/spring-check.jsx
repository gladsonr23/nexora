import React from 'react';
import { createRoot } from 'react-dom/client';
import SpringCheck from './SpringCheck.jsx';

const roots = new WeakMap();

window.NexoraSpringCheck = {
  mount(element, props) {
    let root = roots.get(element);
    if (!root) {
      root = createRoot(element);
      roots.set(element, root);
    }
    root.render(React.createElement(SpringCheck, props));
  },
  unmount(element) {
    const root = roots.get(element);
    if (!root) return;
    root.unmount();
    roots.delete(element);
  }
};
