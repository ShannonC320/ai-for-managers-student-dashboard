import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App, { STORAGE_KEY } from './App';

describe('student dashboard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '#/home');
  });
  afterEach(() => cleanup());

  it('preserves Week 1 navigation and adds the Planner', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /^\s*home\s*$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^\s*profile\s*$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /planner \/ tasks/i })).toBeInTheDocument();
  });

  it('saves and displays a student profile with simple goals', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /set up your profile/i }));
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jordan Lee' } });
    fireEvent.change(screen.getByLabelText(/^major/i), { target: { value: 'Business Administration' } });
    fireEvent.change(screen.getByLabelText(/academic year/i), { target: { value: 'Junior' } });
    fireEvent.change(screen.getByLabelText(/academic goal 1/i), { target: { value: 'Evaluate AI tools confidently' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));
    expect(screen.getByRole('heading', { name: 'Jordan Lee' })).toBeInTheDocument();
    expect(screen.getByText('Evaluate AI tools confidently')).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).name).toBe('Jordan Lee');

    cleanup();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Jordan Lee' })).toBeInTheDocument();
    expect(screen.getByText('Evaluate AI tools confidently')).toBeInTheDocument();
  });

  it('adds and removes separate goal fields', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /set up your profile/i }));
    fireEvent.click(screen.getByRole('button', { name: /add another goal/i }));
    expect(screen.getByLabelText(/academic goal 2/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /remove goal 2/i }));
    expect(screen.queryByLabelText(/academic goal 2/i)).not.toBeInTheDocument();
  });

  it('opens Profile from the student identity and follows browser history views', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      name: 'Jordan Lee',
      major: 'Business Administration',
      academicYear: 'Junior',
      goals: ['Evaluate AI tools confidently'],
    }));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /open profile for jordan lee/i }));
    expect(window.location.hash).toBe('#/profile');
    expect(screen.getByRole('heading', { name: /your academic snapshot/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^\s*home\s*$/i }));
    expect(window.location.hash).toBe('#/home');
    expect(screen.getByRole('heading', { name: /welcome, jordan/i })).toBeInTheDocument();

    window.history.replaceState(null, '', '#/profile');
    fireEvent(window, new PopStateEvent('popstate'));
    expect(screen.getByRole('heading', { name: /your academic snapshot/i })).toBeInTheDocument();

    window.history.replaceState(null, '', '#/home');
    fireEvent(window, new PopStateEvent('popstate'));
    expect(screen.getByRole('heading', { name: /welcome, jordan/i })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).name).toBe('Jordan Lee');
  });
});
