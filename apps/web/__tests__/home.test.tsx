import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from '../src/app/page';

describe('HomePage', () => {
  it('renders the StudyFlow heading', () => {
    render(<HomePage />);
    expect(screen.getByText('StudyFlow')).toBeInTheDocument();
  });

  it('renders all four feature cards', () => {
    render(<HomePage />);
    expect(screen.getByText('Study')).toBeInTheDocument();
    expect(screen.getByText('Habits')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });

  it('renders the version tag', () => {
    render(<HomePage />);
    expect(screen.getByText(/v0\.1\.0/)).toBeInTheDocument();
  });
});
