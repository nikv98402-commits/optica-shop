import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FaceFitMeasurement } from '../../../lib/faceFitEngine';
import { GuidedCameraCapture, getCameraGuidance } from '../GuidedCameraCapture';

const analyzeFacePhotoMock = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/faceFitEngine', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../lib/faceFitEngine')>();
  return { ...original, analyzeFacePhoto: analyzeFacePhotoMock };
});

function measurement(overrides: Partial<FaceFitMeasurement> = {}): FaceFitMeasurement {
  return {
    status: 'ready',
    confidence: 90,
    faceCount: 1,
    eyeDistanceRatio: 0.25,
    frameWidthHint: 64,
    frameCenterX: 50,
    frameCenterY: 43,
    eyeLineTiltDeg: 1,
    bridgeOffsetPct: 1,
    overlayPoints: [],
    checks: [],
    limitations: [],
    ...overrides,
  };
}

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
const originalReadyState = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'readyState');
const originalVideoWidth = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'videoWidth');
const originalVideoHeight = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'videoHeight');
const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

function setMediaDevices(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  analyzeFacePhotoMock.mockReset();
  if (originalMediaDevices) {
    Object.defineProperty(navigator, 'mediaDevices', originalMediaDevices);
  } else {
    Reflect.deleteProperty(navigator, 'mediaDevices');
  }
  if (originalReadyState) Object.defineProperty(HTMLMediaElement.prototype, 'readyState', originalReadyState);
  if (originalVideoWidth) Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', originalVideoWidth);
  if (originalVideoHeight) Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', originalVideoHeight);
  if (originalCreateObjectUrl) {
    Object.defineProperty(URL, 'createObjectURL', originalCreateObjectUrl);
  } else {
    Reflect.deleteProperty(URL, 'createObjectURL');
  }
  if (originalRevokeObjectUrl) {
    Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectUrl);
  } else {
    Reflect.deleteProperty(URL, 'revokeObjectURL');
  }
});

describe('guided camera distance feedback', () => {
  it('asks the user to move closer when the face is too small', () => {
    const guidance = getCameraGuidance(measurement({ frameWidthHint: 48, eyeDistanceRatio: 0.16 }), 'ru');
    expect(guidance.tone).toBe('adjust');
    expect(guidance.title).toBe('Подойдите немного ближе');
  });

  it('asks the user to move farther away when the face is too large', () => {
    const guidance = getCameraGuidance(measurement({ frameWidthHint: 80, eyeDistanceRatio: 0.34 }), 'en');
    expect(guidance.tone).toBe('adjust');
    expect(guidance.title).toBe('Move the phone farther away');
  });

  it('prioritizes head alignment after distance is acceptable', () => {
    const guidance = getCameraGuidance(measurement({ eyeLineTiltDeg: 9 }), 'ru');
    expect(guidance.title).toBe('Держите телефон ровно');
  });

  it('marks a centered, front-facing capture as ready', () => {
    const guidance = getCameraGuidance(measurement(), 'ru');
    expect(guidance.tone).toBe('ready');
    expect(guidance.title).toBe('Расстояние оптимальное');
  });

  it('does not allow a no-face result to look ready', () => {
    const guidance = getCameraGuidance(measurement({ status: 'no_face', faceCount: 0 }), 'en');
    expect(guidance.tone).toBe('adjust');
    expect(guidance.title).toBe('Face not found');
  });

  it('asks for one person when multiple faces are detected', () => {
    const guidance = getCameraGuidance(measurement({ status: 'multiple_faces', faceCount: 2 }), 'ru');
    expect(guidance.tone).toBe('adjust');
    expect(guidance.title).toBe('В кадре должен быть один человек');
  });

  it('asks the user to center the bridge after distance and level are acceptable', () => {
    const guidance = getCameraGuidance(measurement({ bridgeOffsetPct: 8 }), 'en');
    expect(guidance.tone).toBe('adjust');
    expect(guidance.title).toBe('Center your face');
  });
});

describe('guided camera lifecycle', () => {
  it('shows a fallback when the browser has no camera API', async () => {
    Reflect.deleteProperty(navigator, 'mediaDevices');

    render(<GuidedCameraCapture language="en" onCapture={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByText('This browser does not support camera access.')).toBeInTheDocument();
  });

  it('stops the acquired camera stream when video playback fails', async () => {
    const stop = vi.fn();
    setMediaDevices(vi.fn().mockResolvedValue({
      getTracks: () => [{ stop }],
    }));
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new DOMException('Playback failed', 'NotSupportedError'));

    render(<GuidedCameraCapture language="en" onCapture={vi.fn()} onClose={vi.fn()} />);

    await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Could not start the camera. Close other apps using it and try again.')).toBeInTheDocument();
  });

  it('moves focus into the dialog and closes it with Escape', async () => {
    setMediaDevices(vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')));
    const onClose = vi.fn();

    render(<GuidedCameraCapture language="ru" onCapture={vi.fn()} onClose={onClose} />);

    expect(screen.getByRole('button', { name: 'Закрыть камеру' })).toHaveFocus();
    await screen.findByText('Доступ к камере закрыт. Разрешите камеру в настройках браузера или загрузите готовое фото.');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('restores focus and page scrolling after the dialog unmounts', async () => {
    setMediaDevices(vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')));
    const trigger = document.createElement('button');
    trigger.textContent = 'Open camera';
    document.body.appendChild(trigger);
    trigger.focus();
    document.body.style.overflow = 'auto';

    const view = render(<GuidedCameraCapture language="en" onCapture={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText('Camera access is blocked. Allow it in browser settings or upload an existing photo.');

    view.unmount();

    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('auto');
    trigger.remove();
  });

  it('stops the live camera stream when the dialog unmounts', async () => {
    const stop = vi.fn();
    setMediaDevices(vi.fn().mockResolvedValue({
      getTracks: () => [{ stop }],
    }));
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();

    const view = render(<GuidedCameraCapture language="en" onCapture={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText('Place your face in the guide');
    view.unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('ignores a second capture while the first photo is still being processed', async () => {
    const stop = vi.fn();
    setMediaDevices(vi.fn().mockResolvedValue({
      getTracks: () => [{ stop }],
    }));
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    Object.defineProperties(HTMLVideoElement.prototype, {
      readyState: { configurable: true, get: () => 4 },
      videoWidth: { configurable: true, get: () => 640 },
      videoHeight: { configurable: true, get: () => 480 },
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      translate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['photo'], { type: 'image/jpeg' }));
    });
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: vi.fn(() => 'blob:camera-frame') },
      revokeObjectURL: { configurable: true, value: vi.fn() },
    });
    analyzeFacePhotoMock.mockResolvedValue(measurement());

    let finishCapture: (() => void) | undefined;
    const onCapture = vi.fn(() => new Promise<void>((resolve) => {
      finishCapture = resolve;
    }));
    render(<GuidedCameraCapture language="ru" onCapture={onCapture} onClose={vi.fn()} />);

    const captureButton = await screen.findByRole('button', { name: 'Сделать фото' });
    await waitFor(() => expect(captureButton).toBeEnabled());
    fireEvent.click(captureButton);
    fireEvent.click(captureButton);

    await waitFor(() => expect(onCapture).toHaveBeenCalledTimes(1));
    finishCapture?.();
    await waitFor(() => expect(captureButton).toBeEnabled());
  });
});
