import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { EYE_MAP_STORAGE_KEY } from '../../lib/eyeMap/storage';
import { EyeMap } from '../EyeMap';

const analyzeFacePhoto = vi.fn();

vi.mock('../../lib/faceFitEngine', () => ({
  analyzeFacePhoto: (...args: unknown[]) => analyzeFacePhoto(...args),
}));

vi.mock('../../lib/eyeMap/eyeMapAnalytics', () => ({
  getEyeMapAnalyticsCommon: (language: 'ru' | 'en') => ({
    language,
    deviceClass: 'desktop',
  }),
  trackEyeMapEvent: vi.fn(),
}));

describe('EyeMap', () => {
  beforeEach(() => {
    analyzeFacePhoto.mockReset();
    vi.stubGlobal(
      'crypto',
      { randomUUID: vi.fn(() => '00000000-0000-4000-8000-000000000001') },
    );
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:eye-map-photo'),
      revokeObjectURL: vi.fn(),
    });
  });

  it('runs upload to local result and saves no photo data', async () => {
    analyzeFacePhoto.mockResolvedValue({
      status: 'ready',
      confidence: 90,
      faceCount: 1,
      eyeDistanceRatio: 0.24,
      frameWidthHint: 60,
      frameCenterX: 50,
      frameCenterY: 43,
      eyeLineTiltDeg: 1,
      bridgeOffsetPct: 1,
      overlayPoints: [
        { id: 'left-eye', x: 42, y: 40 },
        { id: 'right-eye', x: 58, y: 40 },
      ],
      checks: [],
      limitations: [],
    });
    const user = userEvent.setup();
    const view = render(
      <LanguageProvider>
        <EyeMap onNavigate={vi.fn()} />
      </LanguageProvider>,
    );
    const input = view.container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(
      input,
      new File(['photo'], 'eye-map.jpg', { type: 'image/jpeg' }),
    );

    expect(await screen.findByText('Ваш Eye Map готов')).toBeVisible();
    expect(screen.getByText('Это ваша первая точка отсчета')).toBeVisible();
    expect(screen.queryByText('Показать ориентиры')).toBeVisible();
    await user.click(
      screen.getByRole('button', { name: /сохранить точку отсчета/i }),
    );

    await waitFor(() =>
      expect(window.localStorage.getItem(EYE_MAP_STORAGE_KEY)).toContain(
        '"schemaVersion":1',
      ),
    );
    const stored = window.localStorage.getItem(EYE_MAP_STORAGE_KEY) ?? '';
    expect(stored).not.toContain('blob:eye-map-photo');
    expect(stored).not.toContain('data:image');
  });

  it('shows a recoverable message for an unsupported file', async () => {
    const view = render(
      <LanguageProvider>
        <EyeMap onNavigate={vi.fn()} />
      </LanguageProvider>,
    );
    const input = view.container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    fireEvent.change(input, {
      target: {
        files: [new File(['photo'], 'eye-map.heic', { type: 'image/heic' })],
      },
    });

    expect(
      await screen.findByText('Выберите JPEG, PNG или WebP.'),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: /переснять/i }),
    ).toBeEnabled();
    expect(analyzeFacePhoto).not.toHaveBeenCalled();
  });
});
