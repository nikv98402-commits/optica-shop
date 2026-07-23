import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { Home } from '../Home';

vi.mock('../../config/features', () => ({
  publicFeatures: { eyeMap: false, knowledgeAssistant: false },
}));

describe('Home', () => {
  it('does not render assistant actions when the feature is disabled', () => {
    render(
      <LanguageProvider>
        <Home onNavigate={vi.fn()} />
      </LanguageProvider>,
    );

    expect(screen.queryByRole('region', { name: 'Спросить ViLu' })).not.toBeInTheDocument();
  });
});
