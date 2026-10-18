import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import './HoldButton.css';

const TAP_MS = 250;
const HIT_PAD = 10;
const EASE_OUT = value => 1 - Math.pow(1 - value, 3);

export default function HoldButton({
  children = 'Hold to delete',
  doneLabel = 'Deleted',
  backgroundColor = '#27272a',
  fillColor = '#b73516',
  textColor = '#f5f5f5',
  fillTextColor = '#ffffff',
  size = 'md',
  radius = 14,
  fillDirection = 'right',
  holdTime = 2000,
  releaseTime = 200,
  pressScale = 0.97,
  wave = true,
  waveAmplitude = 6,
  glow = true,
  resetAfter = 1200,
  disabled = false,
  onHold,
  onTap,
  className = '',
}) {
  const [phase, setPhase] = useState('idle');
  const [input, setInput] = useState(null);
  const phaseRef = useRef('idle');
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const gesture = useRef({ pointerId: null, start: 0, rect: null });
  const timers = useRef({ complete: 0, reset: 0 });
  const motion = useRef({ raf: 0, progress: 0, from: 0, to: 0, start: 0 });
  const hintId = useId();

  const go = (next, kind = null) => {
    phaseRef.current = next;
    inputRef.current = kind;
    setPhase(next);
    setInput(kind);
  };

  const clearTimers = () => {
    clearTimeout(timers.current.complete);
    clearTimeout(timers.current.reset);
  };

  const complete = () => {
    if (phaseRef.current !== 'holding') return;
    if (performance.now() - gesture.current.start < holdTime - 50) return;
    clearTimers();
    go('done', inputRef.current);
    onHold?.();
    if (resetAfter > 0) {
      timers.current.reset = setTimeout(() => {
        go('idle');
        drive(0, releaseTime, EASE_OUT);
      }, resetAfter);
    }
  };

  const drive = (target, duration, ease) => {
    const current = motion.current;
    cancelAnimationFrame(current.raf);
    current.from = current.progress;
    current.to = target;
    current.start = performance.now();
    const step = now => {
      const t = duration > 0 ? Math.min(1, (now - current.start) / duration) : 1;
      current.progress = current.from + (current.to - current.from) * ease(t);
      buttonRef.current?.style.setProperty('--hb-p', current.progress.toFixed(4));
      if (t < 1) {
        current.raf = requestAnimationFrame(step);
        return;
      }
      current.raf = 0;
      if (current.to === 1) complete();
    };
    current.raf = requestAnimationFrame(step);
  };

  const begin = kind => {
    if (disabled || phaseRef.current !== 'idle' || !buttonRef.current) return false;
    gesture.current.start = performance.now();
    gesture.current.rect = buttonRef.current.getBoundingClientRect();
    go('holding', kind);
    drive(1, holdTime, value => value);
    timers.current.complete = setTimeout(complete, holdTime + 100);
    return true;
  };

  const release = ({ drifted = false } = {}) => {
    if (phaseRef.current !== 'holding') return;
    clearTimers();
    const held = performance.now() - gesture.current.start;
    go('idle');
    drive(0, releaseTime, EASE_OUT);
    if (!drifted && held < TAP_MS) onTap?.();
  };
  const releaseRef = useRef(release);
  releaseRef.current = release;

  const handlePointerDown = event => {
    if (event.button !== 0 || !event.isPrimary || gesture.current.pointerId !== null) return;
    if (!begin('pointer')) return;
    gesture.current.pointerId = event.pointerId;
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
  };

  const endPointer = (event, options) => {
    if (event.pointerId !== gesture.current.pointerId) return;
    gesture.current.pointerId = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
    release(options);
  };

  const handlePointerMove = event => {
    if (event.pointerId !== gesture.current.pointerId) return;
    const rect = gesture.current.rect;
    if (!rect) return;
    const drifted = event.clientX < rect.left - HIT_PAD || event.clientX > rect.right + HIT_PAD ||
      event.clientY < rect.top - HIT_PAD || event.clientY > rect.bottom + HIT_PAD;
    if (drifted) endPointer(event, { drifted: true });
  };

  const handlePointerLeave = event => {
    if (event.pointerType !== 'touch') endPointer(event, { drifted: true });
  };

  const handleKeyDown = event => {
    if (event.key === 'Escape') {
      if (inputRef.current === 'key') release({ drifted: true });
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!event.repeat) begin('key');
    }
  };

  const handleKeyUp = event => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (inputRef.current === 'key') release();
    }
  };

  useLayoutEffect(() => {
    const button = buttonRef.current;
    if (!button) return undefined;
    const measure = () => {
      button.style.setProperty('--hb-w', `${button.offsetWidth}px`);
      button.style.setProperty('--hb-h', `${button.offsetHeight}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (phase !== 'holding') return undefined;
    const cancel = () => releaseRef.current({ drifted: true });
    const onVisibility = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [phase]);

  useEffect(() => () => {
    clearTimers();
    cancelAnimationFrame(motion.current.raf);
  }, []);

  const direction = fillDirection === 'up' ? 'up' : 'right';
  const labels = <>
    <span className="hold-button__idle" aria-hidden={phase === 'done'}>{children}</span>
    <span className="hold-button__done" aria-hidden={phase !== 'done'}>{doneLabel}</span>
  </>;

  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      className={`hold-button hold-button--${size}${className ? ` ${className}` : ''}`}
      data-phase={phase}
      data-input={input ?? undefined}
      data-direction={direction}
      data-glow={glow ? 'true' : undefined}
      aria-describedby={hintId}
      style={{
        '--hb-radius': `${radius}px`, '--hb-bg': backgroundColor, '--hb-fill': fillColor,
        '--hb-text': textColor, '--hb-fill-text': fillTextColor, '--hb-hold': `${holdTime}ms`,
        '--hb-cycles': holdTime / 1100, '--hb-release': `${releaseTime}ms`, '--hb-press': pressScale,
        '--hb-wave': `${wave ? waveAmplitude : 0}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={event => endPointer(event)}
      onPointerCancel={event => endPointer(event, { drifted: true })}
      onLostPointerCapture={event => endPointer(event, { drifted: true })}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onContextMenu={event => event.preventDefault()}
    >
      <span className="hold-button__pulse" aria-hidden="true" />
      <span className="hold-button__label">{labels}</span>
      <span className="hold-button__clip" aria-hidden="true">
        <span className="hold-button__fill"><span className="hold-button__label hold-button__label--fill">{labels}</span></span>
        <span className="hold-button__crest" aria-hidden="true"><span className="hold-button__label hold-button__label--fill">{labels}</span></span>
      </span>
      <span id={hintId} className="hold-button__sr">Press and hold for {Math.round(holdTime / 100) / 10} seconds to confirm</span>
    </button>
  );
}
