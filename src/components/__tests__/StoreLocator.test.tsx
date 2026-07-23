import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StoreLocator } from '../StoreLocator';

const trackEvent = vi.fn();

vi.mock('../../lib/analyticsEvents', () => ({
  AnalyticsEvent: {
    NearbyOpticsOpened: 'nearby_optics_opened',
    RouteClicked: 'route_clicked',
    CallClicked: 'call_clicked',
    WhatsappClicked: 'whatsapp_clicked',
    TelegramClicked: 'telegram_clicked',
  },
  trackEvent: (...args: unknown[]) => trackEvent(...args),
}));

vi.mock('../../data/opticsDirectory', () => ({
  opticsDirectory: [
    {
      id: 'moscow',
      name: 'ViLu Pilot',
      address: 'Москва, Земляной Вал, 33',
      city: 'Москва',
      lat: 55.75,
      lng: 37.65,
      phone: '+7 999 000-00-00',
      whatsapp: '+79990000000',
      telegram: 'vilu_pilot',
      hours: '10:00-22:00',
      source: 'partner',
      partnerStatus: 'partner',
    },
    {
      id: 'kazan',
      name: 'Оптика Бауман',
      address: 'Казань, ул. Баумана, 51',
      city: 'Казань',
      lat: 55.78,
      lng: 49.11,
      hours: 'Уточните перед визитом',
      source: 'public',
      partnerStatus: 'listed',
    },
  ],
}));

vi.mock('../home/AtomicHeading', () => ({
  AtomicHeading: ({ lines }: { lines: string[] }) => <h1>{lines.join(' ')}</h1>,
}));
vi.mock('../home/OpticalOrbits', () => ({ OpticalOrbits: () => null }));

describe('StoreLocator', () => {
  beforeEach(() => {
    trackEvent.mockReset();
    document.body.style.overflow = '';
  });

  it('renders nothing while closed', () => {
    render(<StoreLocator isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('locks body scrolling while open and restores it on cleanup', () => {
    document.body.style.overflow = 'auto';
    const { unmount } = render(<StoreLocator isOpen onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe('hidden');
    expect(trackEvent).toHaveBeenCalledWith('nearby_optics_opened', { method: 'store_locator' });
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('filters by query and city and shows the empty state', async () => {
    const user = userEvent.setup();
    render(<StoreLocator isOpen onClose={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Название, город или адрес'), 'Бауман');
    expect(screen.getAllByText('Казань, ул. Баумана, 51')).toHaveLength(2);
    expect(screen.queryByText('Москва, Земляной Вал, 33')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Название, город или адрес'));
    await user.selectOptions(screen.getByRole('combobox'), 'Москва');
    expect(screen.getAllByText('Москва, Земляной Вал, 33')).toHaveLength(2);
    expect(screen.queryByText('Казань, ул. Баумана, 51')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Название, город или адрес'), 'нет такого салона');
    expect(screen.getByText('По этому запросу салон не найден.')).toBeVisible();
  });

  it('changes the active store from the list and map', async () => {
    const user = userEvent.setup();
    render(<StoreLocator isOpen onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Оптика Бауман/ }));
    expect(screen.getByText('Телефон уточняется')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Москва, Москва, Земляной Вал, 33' }));
    expect(screen.getByText('+7 999 000-00-00')).toBeVisible();
  });

  it('closes and tracks route, call, WhatsApp, and Telegram actions', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<StoreLocator isOpen onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Закрыть салоны' }));
    expect(onClose).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: /ViLu Pilot/ }));
    const links = [
      screen.getByRole('link', { name: 'Маршрут' }),
      screen.getByRole('link', { name: 'Позвонить' }),
      screen.getByRole('link', { name: 'Написать в WhatsApp' }),
      screen.getByRole('link', { name: 'Написать в Telegram' }),
    ];
    for (const link of links) {
      link.addEventListener('click', (event) => event.preventDefault(), { once: true });
      await user.click(link);
    }

    expect(trackEvent).toHaveBeenCalledWith('route_clicked', { source: 'store_locator', store_id: 'moscow' });
    expect(trackEvent).toHaveBeenCalledWith('call_clicked', { source: 'store_locator', store_id: 'moscow' });
    expect(trackEvent).toHaveBeenCalledWith('whatsapp_clicked', { source: 'store_locator', store_id: 'moscow' });
    expect(trackEvent).toHaveBeenCalledWith('telegram_clicked', { source: 'store_locator', store_id: 'moscow' });
  });
});
