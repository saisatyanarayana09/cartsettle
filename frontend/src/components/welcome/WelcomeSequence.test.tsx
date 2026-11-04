import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

vi.mock('../../router', () => ({ useNavigate: () => navigate }));
const navigate = vi.fn();
// The imported legacy app uses JSX; its presentation behavior is exercised directly.
// @ts-expect-error Legacy JSX module has no TypeScript declaration.
import Welcome from '../../owner/pages/Welcome';

beforeEach(() => { vi.useFakeTimers(); navigate.mockClear(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('owner automatically continues to the existing dashboard after the two-second hold and fade', () => {
  render(<Welcome />);
  act(() => vi.advanceTimersByTime(1999));
  expect(navigate).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(301));
  expect(navigate).toHaveBeenCalledWith('/owner');
  expect(navigate).toHaveBeenCalledOnce();
});

it('owner tap-anywhere continuation navigates immediately and cancels later navigation', () => {
  render(<Welcome />);
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Continue to store' }));
  expect(navigate).toHaveBeenCalledWith('/owner');
  act(() => vi.advanceTimersByTime(5000));
  expect(navigate).toHaveBeenCalledOnce();
});