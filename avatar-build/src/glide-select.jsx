import React from 'react';
import { createRoot } from 'react-dom/client';
import GlideSelect from './GlideSelect.jsx';

const roots = new WeakMap();
const nativeSelects = new Set();
const nativeBridges = new WeakMap();
let bridgeId = 0;

function renderNativeSelect(select, bridge) {
  if (!select.isConnected || !select.options.length) return;
  const options = Array.from(select.options, option => ({ value: option.value, label: option.label || option.textContent.trim() }));
  const bounds = select.getBoundingClientRect();
  const ariaLabel = select.getAttribute('aria-label') || bridge.labelText || select.title || 'Choose an option';

  roots.get(bridge.host)?.render(React.createElement(GlideSelect, {
    options,
    value: select.value,
    disabled: select.matches(':disabled'),
    ariaLabel,
    triggerId: bridge.triggerId,
    className: 'nexora-native-glide-select',
    size: 'lg',
    radius: 10,
    menuWidth: Math.max(176, Math.round(bounds.width || 220)),
    accentColor: 'var(--nx-accent)',
    surfaceColor: 'var(--nx-surface)',
    highlightColor: 'var(--nx-accent-soft)',
    textColor: 'var(--nx-text)',
    showTags: false,
    onChange(value) {
      if (select.value === value) return;
      select.value = value;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    },
  }));
}

function enhanceNativeSelect(select) {
  if (!(select instanceof HTMLSelectElement) || nativeBridges.has(select) || !select.options.length) return;
  if (select.multiple || select.size > 1 || select.querySelector('optgroup') || Array.from(select.options).some(option => option.disabled)) return;

  const host = document.createElement('span');
  host.className = 'nexora-glide-select-host';
  const triggerId = `nexora-glide-select-${++bridgeId}`;
  const labels = Array.from(select.labels || []).map(label => ({ label, htmlFor: label.htmlFor }));
  const labelText = labels.map(({ label }) => {
    const clone = label.cloneNode(true);
    clone.querySelectorAll('select, .nexora-glide-select-host').forEach(node => node.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }).filter(Boolean).join(' ');
  const bridge = {
    host,
    triggerId,
    originalTabIndex: select.getAttribute('tabindex'),
    originalAriaHidden: select.getAttribute('aria-hidden'),
    hadHiddenClass: select.classList.contains('nexora-native-select-hidden'),
    labels,
    labelText,
    form: select.form,
    sync: null,
    observer: null,
  };

  select.insertAdjacentElement('afterend', host);
  select.classList.add('nexora-native-select-hidden');
  select.setAttribute('aria-hidden', 'true');
  select.tabIndex = -1;
  labels.forEach(({ label }) => label.htmlFor = triggerId);

  bridge.sync = () => renderNativeSelect(select, bridge);
  bridge.onChange = bridge.sync;
  select.addEventListener('change', bridge.onChange);
  select.addEventListener('input', bridge.onChange);
  bridge.onReset = () => queueMicrotask(bridge.sync);
  bridge.form?.addEventListener('reset', bridge.onReset);
  bridge.observer = new MutationObserver(bridge.sync);
  bridge.observer.observe(select, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['label', 'value', 'selected', 'disabled'],
  });

  nativeBridges.set(select, bridge);
  nativeSelects.add(select);
  roots.set(host, createRoot(host));
  bridge.sync();
}

function removeNativeSelect(select) {
  const bridge = nativeBridges.get(select);
  if (!bridge) return;
  bridge.observer.disconnect();
  select.removeEventListener('change', bridge.onChange);
  select.removeEventListener('input', bridge.onChange);
  bridge.form?.removeEventListener('reset', bridge.onReset);
  bridge.labels.forEach(({ label, htmlFor }) => {
    if (label.htmlFor === bridge.triggerId) {
      if (htmlFor) label.htmlFor = htmlFor;
      else label.removeAttribute('for');
    }
  });
  if (!bridge.hadHiddenClass) select.classList.remove('nexora-native-select-hidden');
  if (bridge.originalAriaHidden === null) select.removeAttribute('aria-hidden');
  else select.setAttribute('aria-hidden', bridge.originalAriaHidden);
  if (bridge.originalTabIndex === null) select.removeAttribute('tabindex');
  else select.setAttribute('tabindex', bridge.originalTabIndex);
  roots.get(bridge.host)?.unmount();
  roots.delete(bridge.host);
  bridge.host.remove();
  nativeBridges.delete(select);
  nativeSelects.delete(select);
}

function scanForNativeSelects(node) {
  if (!(node instanceof Element)) return;
  if (node.matches('select')) enhanceNativeSelect(node);
  node.querySelectorAll('select').forEach(enhanceNativeSelect);
}

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
  },
  syncNative(select) {
    nativeBridges.get(select)?.sync();
  },
  enhanceAll(root = document) {
    scanForNativeSelects(root.documentElement || root);
  }
};

scanForNativeSelects(document.documentElement);
const nativeSelectObserver = new MutationObserver(records => {
  for (const record of records) {
    if (record.type === 'attributes' && record.attributeName === 'disabled') {
      nativeSelects.forEach(select => nativeBridges.get(select)?.sync());
    }
    if (record.type === 'childList') {
      if (record.target instanceof HTMLSelectElement) enhanceNativeSelect(record.target);
      record.addedNodes.forEach(scanForNativeSelects);
      record.removedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        const removed = [];
        if (node.matches('select')) removed.push(node);
        removed.push(...node.querySelectorAll('select'));
        removed.forEach(select => { if (!select.isConnected) removeNativeSelect(select); });
      });
    }
  }
});
nativeSelectObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['disabled'],
});
