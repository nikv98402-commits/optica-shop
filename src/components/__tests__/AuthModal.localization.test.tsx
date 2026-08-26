import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { AuthModal } from '../AuthModal';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ signIn: vi.fn(), signUp: vi.fn() }),
}));

describe('AuthModal localization', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses a fully localized email label in Russian', () => {
    render(
      <LanguageProvider>
        <AuthModal isOpen onClose={vi.fn()} mode="login" />
      </LanguageProvider>,
    );

    expect(screen.getByRole('textbox', { name: 'Электронная почта' })).toBeInTheDocument();
    expect(screen.queryByText(/^EMAIL$/i)).not.toBeInTheDocument();
  });

  it('keeps the English email field keyboard-operable', async () => {
    window.localStorage.setItem('vilu_language', 'en');
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <AuthModal isOpen onClose={vi.fn()} mode="login" />
      </LanguageProvider>,
    );

    const email = screen.getByRole('textbox', { name: 'Email Address' });
    email.focus();
    await user.keyboard('person@example.com');
    expect(email).toHaveValue('person@example.com');
  });

  it.each([
    { language: 'ru', emailName: 'Электронная почта', triggerName: 'Открыть вход' },
    { language: 'en', emailName: 'Email Address', triggerName: 'Open sign in' },
  ] as const)('traps focus, closes on Escape, and restores focus in $language', async ({ language, emailName, triggerName }) => {
    if (language === 'en') window.localStorage.setItem('vilu_language', 'en');
    const user = userEvent.setup();

    function Harness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <LanguageProvider>
          <button onClick={() => setIsOpen(true)}>{triggerName}</button>
          <AuthModal isOpen={isOpen} onClose={() => setIsOpen(false)} mode="login" />
        </LanguageProvider>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: triggerName });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog');
    const email = screen.getByRole('textbox', { name: emailName });
    await waitFor(() => expect(email).toHaveFocus());
    expect(dialog.parentElement?.parentElement).toBe(document.body);

    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
