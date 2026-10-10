import React from 'react';
import { createRoot } from 'react-dom/client';
import Avatar from '@gschoppe/avataaars';
import '@gschoppe/avataaars/dist/animations.css';

const roots = new WeakMap();

window.NexoraAvatar = {
  render(element, config) {
    let root = roots.get(element);
    if (!root) {
      root = createRoot(element);
      roots.set(element, root);
    }
    root.render(React.createElement(Avatar, {
      style: { width: '100%', height: '100%' },
      animated: true,
      facialHairType: 'Blank',
      ...config,
    }));
  },
  unmount(element) {
    const root = roots.get(element);
    if (!root) return;
    root.unmount();
    roots.delete(element);
  },
};
