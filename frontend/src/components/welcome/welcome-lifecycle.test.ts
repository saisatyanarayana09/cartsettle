import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readWelcomeName, startWelcomeSequence } from './welcome-lifecycle';

describe('welcome continuation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it('begins automatic continuation at two seconds and completes the soft fade', () => {
    const onFade = vi.fn();
    const onContinue = vi.fn();
    startWelcomeSequence({ onFade, onContinue });
    vi.advanceTimersByTime(1999);
    expect(onFade).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onFade).toHaveBeenCalledOnce();
    expect(onContinue).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(onContinue).toHaveBeenCalledOnce();
  });
  it('tap-anywhere skipping completes immediately and only once', () => {
    const onContinue = vi.fn();
    const sequence = startWelcomeSequence({ onFade: vi.fn(), onContinue });
    sequence.skip();
    expect(onContinue).toHaveBeenCalledOnce();
    sequence.skip();
    vi.advanceTimersByTime(5000);
    expect(onContinue).toHaveBeenCalledOnce();
  });
  it('unmount cancels pending continuation', () => {
    const onContinue = vi.fn();
    const sequence = startWelcomeSequence({ onFade: vi.fn(), onContinue });
    sequence.cancel();
    vi.advanceTimersByTime(5000);
    expect(onContinue).not.toHaveBeenCalled();
  });
  it('omits a missing person name rather than inventing one', () => {
    expect(readWelcomeName({ getItem: () => '{}' }, 'user')).toBe('');
    expect(readWelcomeName({ getItem: () => '{invalid' }, 'user')).toBe('');
  });
  it('uses the saved person name', () => {
    expect(readWelcomeName({ getItem: () => '{"first_name":"Sāì"}' }, 'user')).toBe('Sāì');
  });
  it('keeps the welcome after two seconds until the page is ready', () => {
    const onFade = vi.fn();
    const onContinue = vi.fn();
    const sequence = startWelcomeSequence({ onFade, onContinue, ready: false });
    vi.advanceTimersByTime(4000);
    expect(onFade).not.toHaveBeenCalled();
    expect(onContinue).not.toHaveBeenCalled();
    sequence.setReady(true);
    vi.advanceTimersByTime(300);
    expect(onContinue).toHaveBeenCalledOnce();
  });
  it('tapping before readiness waits safely then continues immediately', () => {
    const onContinue = vi.fn();
    const sequence = startWelcomeSequence({ onFade: vi.fn(), onContinue, ready: false });
    sequence.skip();
    vi.advanceTimersByTime(4000);
    expect(onContinue).not.toHaveBeenCalled();
    sequence.setReady(true);
    expect(onContinue).toHaveBeenCalledOnce();
  });
  it('repeated readiness signals do not restart the 300ms fade', () => {
    const onFade = vi.fn();
    const onContinue = vi.fn();
    const sequence = startWelcomeSequence({ onFade, onContinue });
    vi.advanceTimersByTime(2000);
    vi.advanceTimersByTime(150);
    sequence.setReady(true);
    expect(onFade).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(150);
    expect(onContinue).toHaveBeenCalledOnce();
  });
  it('keeps the welcome visible if readiness is lost during the fade', () => {
    const onFade = vi.fn();
    const onContinue = vi.fn();
    const sequence = startWelcomeSequence({ onFade, onContinue });
    vi.advanceTimersByTime(2100);
    sequence.setReady(false);
    expect(onFade).toHaveBeenLastCalledWith(false);
    vi.advanceTimersByTime(1000);
    expect(onContinue).not.toHaveBeenCalled();
    sequence.setReady(true);
    vi.advanceTimersByTime(300);
    expect(onContinue).toHaveBeenCalledOnce();
  });
});