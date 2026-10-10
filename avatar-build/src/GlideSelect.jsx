import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, Tick02Icon } from '@hugeicons/core-free-icons';

import './GlideSelect.css';

const SIZES = {
  sm: { chip: 28, row: 26, font: 12 },
  md: { chip: 32, row: 30, font: 13 },
  lg: { chip: 44, row: 40, font: 14 }
};
const PAD = 4;
const GAP = 1;
const MENU_GAP = 6;
const DEFAULT_OPTIONS = ['One', 'Two', 'Three'];

const normalizeOption = (option) =>
  typeof option === 'string' ? { value: option, label: option } : option;

const optionText = (option) =>
  typeof option.label === 'string' ? option.label : option.value;

const typeaheadIndex = (items, from, character) => {
  const first = character.toLowerCase();
  for (let offset = 1; offset <= items.length; offset += 1) {
    const index = (from + offset) % items.length;
    if (optionText(items[index]).toLowerCase().startsWith(first)) return index;
  }
  return from;
};

export default function GlideSelect({
  options = DEFAULT_OPTIONS,
  value,
  defaultValue,
  onChange,
  placeholder = 'Select…',
  showTags = true,
  accentColor = '#f5f5f5',
  surfaceColor = '#27272a',
  highlightColor = '#3f3f46',
  textColor = '#f5f5f5',
  size = 'md',
  radius = 10,
  menuWidth = 176,
  placement = 'bottom',
  align = 'left',
  popDuration = 180,
  glideDuration = 220,
  rememberPosition = true,
  disabled = false,
  ariaLabel = 'Select',
  className = ''
}) {
  const items = options.map(normalizeOption);
  const [innerValue, setInnerValue] = useState(defaultValue ?? '');
  const current = value ?? innerValue;
  const selected = items.findIndex((item) => item.value === current);
  const [phase, setPhase] = useState('closed');
  const [active, setActive] = useState(null);
  const [side, setSide] = useState(placement);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const pillRef = useRef(null);
  const instant = useRef(false);
  const closeTimer = useRef(undefined);
  const scrub = useRef(null);
  const id = useId();
  const dimensions = SIZES[size] ?? SIZES.md;
  const step = dimensions.row + GAP;
  const popOut = Math.round((popDuration * 2) / 3);

  useLayoutEffect(() => {
    if (phase !== 'open') return;
    const menu = menuRef.current;
    const root = rootRef.current;
    if (!menu || !root) return;

    const bounds = root.getBoundingClientRect();
    const requiredSpace = menu.offsetHeight + MENU_GAP;
    setSide(
      placement === 'bottom' && bounds.bottom + requiredSpace > window.innerHeight
        ? 'top'
        : placement === 'top' && bounds.top - requiredSpace < 0
          ? 'bottom'
          : placement
    );

    menu.style.transitionDuration = instant.current ? '0ms' : '';
    menu.dataset.state = 'closed';
    void menu.offsetHeight;
    menu.dataset.state = 'open';

    const pill = pillRef.current;
    if (pill) {
      pill.style.transition = 'none';
      pill.style.transform = `translateY(${Math.max(0, selected) * step}px)`;
      pill.style.opacity = '0';
      void pill.offsetHeight;
      pill.style.transition = '';
    }
  }, [phase]);

  useLayoutEffect(() => {
    const pill = pillRef.current;
    if (!pill || phase !== 'open') return;
    if (active === null) {
      pill.style.opacity = '0';
      return;
    }

    const jump = instant.current || pill.style.opacity !== '1';
    pill.style.transitionDuration = jump ? '0ms, 150ms' : '';
    pill.style.transform = `translateY(${active * step}px)`;
    pill.style.opacity = '1';
    instant.current = false;
  }, [active, phase, step]);

  const open = (viaKey) => {
    if (disabled) return;
    clearTimeout(closeTimer.current);
    instant.current = true;
    setActive(selected >= 0 ? selected : viaKey ? 0 : null);
    setPhase('open');
  };

  const close = (mode) => {
    setActive(null);
    clearTimeout(closeTimer.current);
    const menu = menuRef.current;
    if (mode === 'instant' || !menu) {
      setPhase('closed');
      return;
    }

    menu.style.transitionDuration = '';
    menu.dataset.state = 'closed';
    setPhase('closing');
    closeTimer.current = setTimeout(() => setPhase('closed'), popOut + 20);
  };

  const pick = (index, viaKey) => {
    const option = items[index];
    if (!option) {
      close('instant');
      return;
    }

    if (option.value !== current) {
      if (value === undefined) setInnerValue(option.value);
      onChange?.(option.value, option);
      if (!viaKey && rootRef.current) rootRef.current.dataset.swap = '';
    }
    close('instant');
    triggerRef.current?.focus({ preventScroll: true });
  };

  const onTriggerKey = (event) => {
    const key = event.key;
    const currentIndex = active ?? Math.max(0, selected);
    if (phase !== 'open') {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(key)) {
        event.preventDefault();
        open(true);
      }
      return;
    }

    const moveTo = (index) => {
      event.preventDefault();
      instant.current = true;
      setActive(Math.min(items.length - 1, Math.max(0, index)));
    };

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      moveTo(active === null ? currentIndex : currentIndex + (key === 'ArrowDown' ? 1 : -1));
    } else if (key === 'Home' || key === 'End') {
      moveTo(key === 'Home' ? 0 : items.length - 1);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      pick(currentIndex, true);
    } else if (key === 'Escape' || key === 'Tab') {
      if (key === 'Escape') event.preventDefault();
      close('instant');
    } else if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      moveTo(typeaheadIndex(items, currentIndex, key));
    }
  };

  useEffect(() => {
    if (phase === 'closed') return undefined;
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) close('pop');
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [phase]);

  useEffect(() => {
    if (disabled && phase !== 'closed') close('instant');
  }, [disabled]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const rowAt = (clientY) => {
    if (!scrub.current) return null;
    const index = Math.floor((clientY - scrub.current.top - PAD) / step);
    return index >= 0 && index < items.length ? index : null;
  };

  const onListDown = (event) => {
    if (scrub.current) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    scrub.current = { id: event.pointerId, top: event.currentTarget.getBoundingClientRect().top };
    instant.current = true;
    setActive(rowAt(event.clientY));
  };

  const onListMove = (event) => {
    if (!scrub.current || scrub.current.id !== event.pointerId) return;
    const index = rowAt(event.clientY);
    if (index !== active) setActive(index);
  };

  const onListUp = (event) => {
    if (!scrub.current || scrub.current.id !== event.pointerId) return;
    const index = event.type === 'pointerup' ? rowAt(event.clientY) : null;
    scrub.current = null;
    if (index !== null) pick(index, false);
    else if (!rememberPosition) setActive(null);
  };

  const onListOver = (event) => {
    if (event.pointerType === 'touch' || scrub.current) return;
    const row = event.target.closest('[data-index]');
    if (!row) return;
    const index = Number(row.dataset.index);
    if (index !== active) setActive(index);
  };

  const origin = `${side === 'bottom' ? 'top' : 'bottom'} ${align}`;
  return (
    <div
      ref={rootRef}
      className={`glide-select${className ? ` ${className}` : ''}`}
      data-size={size}
      data-disabled={disabled ? '' : undefined}
      style={{
        '--gs-accent': accentColor,
        '--gs-surface': surfaceColor,
        '--gs-highlight': highlightColor,
        '--gs-text': textColor,
        '--gs-radius': `${radius}px`,
        '--gs-inner-radius': `${Math.max(3, radius - 4)}px`,
        '--gs-chip': `${dimensions.chip}px`,
        '--gs-row': `${dimensions.row}px`,
        '--gs-font': `${dimensions.font}px`,
        '--gs-menu-w': `${menuWidth}px`,
        '--gs-pop': `${popDuration}ms`,
        '--gs-pop-out': `${popOut}ms`,
        '--gs-glide': `${glideDuration}ms`,
        '--gs-origin': origin
      }}
      onAnimationEnd={(event) => {
        if (event.animationName === 'gs-swap' && rootRef.current) delete rootRef.current.dataset.swap;
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={phase === 'open'}
        aria-controls={`${id}-list`}
        aria-activedescendant={active !== null ? `${id}-${active}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        className="glide-select__trigger"
        onPointerDown={(event) => {
          if (event.button !== 0 || disabled) return;
          event.currentTarget.focus({ preventScroll: true });
          if (phase === 'open') close('pop');
          else open(false);
        }}
        onKeyDown={onTriggerKey}
      >
        <span className="glide-select__label" key={current} data-empty={selected < 0 ? '' : undefined}>
          {selected >= 0 ? items[selected].label : placeholder}
        </span>
        <span className="glide-select__chevron" aria-hidden="true">
          <HugeiconsIcon icon={ArrowDown01Icon} size={12} strokeWidth={2.5} />
        </span>
      </button>
      {phase !== 'closed' ? (
        <div
          ref={menuRef}
          className="glide-select__menu"
          data-state={phase === 'closing' ? 'closed' : 'open'}
          data-side={side}
          data-align={align}
        >
          <div
            id={`${id}-list`}
            role="listbox"
            aria-label={ariaLabel}
            className="glide-select__list"
            data-live={active !== null ? '' : undefined}
            onPointerOver={onListOver}
            onPointerLeave={() => {
              if (!scrub.current && !rememberPosition) setActive(null);
            }}
            onPointerDown={onListDown}
            onPointerMove={onListMove}
            onPointerUp={onListUp}
            onPointerCancel={onListUp}
            onLostPointerCapture={onListUp}
          >
            <span ref={pillRef} className="glide-select__pill" aria-hidden="true" />
            {items.map((item, index) => (
              <div
                key={item.value}
                id={`${id}-${index}`}
                role="option"
                aria-selected={index === selected}
                data-index={index}
                className="glide-select__option"
              >
                <span className="glide-select__name">{item.label}</span>
                {showTags && item.tag ? <span className="glide-select__tag">{item.tag}</span> : null}
                <span className="glide-select__check" data-on={index === selected ? '' : undefined} aria-hidden="true">
                  <HugeiconsIcon icon={Tick02Icon} size={13} strokeWidth={2.5} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
