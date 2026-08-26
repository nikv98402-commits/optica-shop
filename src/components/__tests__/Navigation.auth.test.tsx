import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthNavigationSession } from '../AuthNavigationBridge';
import { Navigation } from '../Navigation';
import { LanguageProvider } from '../../contexts/LanguageContext';

const authMocks = vi.hoisted(() => ({
  session: null as AuthNavigationSession | null,
  signOut: vi.fn(async () => undefined),
}));

vi.mock('../AuthNavigationBridge', () => ({
  AuthNavigationBridge: ({ onSessionChange }: { onSessionChange: (session: AuthNavigationSession | null) => void }) => {
    useEffect(() => onSessionChange(authMocks.session), [onSessionChange]);
    return <span data-testid="auth-navigation-bridge" hidden />;
  },
}));

vi.mock('../../config/features', () => ({
  publicFeatures: { knowledgeAssistant: false },
}));

function renderNavigation() {
  return render(
    <LanguageProvider>
      <Navigation currentPage="home" onNavigate={vi.fn()} onOpenStores={vi.fn()} />
    </LanguageProvider>,
  );
}

describe('Navigation lazy authenticated controls', () => {
  beforeEach(() => {
    window.localStorage.clear();
    authMocks.session = null;
    authMocks.signOut.mockClear();
  });

  it('does not request the auth bridge or render session controls for an anonymous visitor', async () => {
    renderNavigation();

    expect(screen.queryByTestId('auth-navigation-bridge')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Выйти' })).not.toBeInTheDocument();
    expect(screen.queryByText('Nina Vision')).not.toBeInTheDocument();
  });

  it('restores the user name and localized desktop/mobile sign-out controls when a session hint exists', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('sb-project-ref-auth-token', '{"access_token":"test"}');
    authMocks.session = { userName: 'Nina Vision', signOut: authMocks.signOut };

    renderNavigation();

    await waitFor(() => expect(screen.getByTestId('auth-navigation-bridge')).toBeInTheDocument());
    expect(screen.getByText('Nina Vision')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Выйти' }));
    expect(authMocks.signOut).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }));
    const signOutButtons = screen.getAllByRole('button', { name: 'Выйти' });
    await user.click(signOutButtons[signOutButtons.length - 1]);
    expect(authMocks.signOut).toHaveBeenCalledTimes(2);

    await user.click(screen.getByRole('button', { name: 'Язык: EN' }));
    expect(screen.getAllByRole('button', { name: 'Sign out' })).toHaveLength(2);
    expect(screen.getByText('Nina Vision')).toBeInTheDocument();
  });
});
