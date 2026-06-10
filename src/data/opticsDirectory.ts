export type OpticSource = 'public' | 'partner';
export type OpticPartnerStatus = 'listed' | 'partner';

export interface DirectoryOptic {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  phone: string;
  whatsapp?: string;
  telegram?: string;
  hours: string;
  source: OpticSource;
  partnerStatus: OpticPartnerStatus;
}

export const opticsDirectory: DirectoryOptic[] = [
  {
    id: 'optic-msk-atrium',
    name: 'VisionLux Pilot',
    address: 'Москва, Земляной Вал, 33, ТЦ Атриум',
    city: 'Москва',
    lat: 55.7577,
    lng: 37.6596,
    phone: '+7 999 000-00-00',
    whatsapp: '+79990000000',
    telegram: 'visionlux_pilot',
    hours: '10:00-22:00',
    source: 'partner',
    partnerStatus: 'partner',
  },
  {
    id: 'optic-msk-lenina',
    name: 'Оптика на Ленина',
    address: 'Москва, ул. Ленинская Слобода, 19',
    city: 'Москва',
    lat: 55.7098,
    lng: 37.6544,
    phone: '+7 495 111-22-33',
    whatsapp: '+74951112233',
    telegram: 'optic_lenina',
    hours: '10:00-21:00',
    source: 'public',
    partnerStatus: 'listed',
  },
  {
    id: 'optic-msk-tverskaya',
    name: 'Городская оптика',
    address: 'Москва, Тверская ул., 18',
    city: 'Москва',
    lat: 55.7652,
    lng: 37.6048,
    phone: '+7 495 222-33-44',
    whatsapp: '+74952223344',
    telegram: 'city_optic_msk',
    hours: '09:00-21:00',
    source: 'public',
    partnerStatus: 'listed',
  },
  {
    id: 'optic-msk-kutuz',
    name: 'Оптика Профи',
    address: 'Москва, Кутузовский пр-т, 30',
    city: 'Москва',
    lat: 55.7415,
    lng: 37.5352,
    phone: '+7 495 333-44-55',
    telegram: 'optic_profi_msk',
    hours: '10:00-20:00',
    source: 'public',
    partnerStatus: 'listed',
  },
  {
    id: 'optic-spb-nevsky',
    name: 'Nevsky Optic',
    address: 'Санкт-Петербург, Невский пр-т, 64',
    city: 'Санкт-Петербург',
    lat: 59.9344,
    lng: 30.3351,
    phone: '+7 812 111-22-33',
    whatsapp: '+78121112233',
    telegram: 'nevsky_optic',
    hours: '10:00-21:00',
    source: 'public',
    partnerStatus: 'listed',
  },
  {
    id: 'optic-spb-petro',
    name: 'Петроградская оптика',
    address: 'Санкт-Петербург, Каменноостровский пр-т, 42',
    city: 'Санкт-Петербург',
    lat: 59.9666,
    lng: 30.3115,
    phone: '+7 812 222-33-44',
    telegram: 'petrograd_optic',
    hours: '10:00-20:00',
    source: 'public',
    partnerStatus: 'listed',
  },
  {
    id: 'optic-kzn-bauman',
    name: 'Оптика Бауман',
    address: 'Казань, ул. Баумана, 51',
    city: 'Казань',
    lat: 55.7895,
    lng: 49.1179,
    phone: '+7 843 111-22-33',
    whatsapp: '+78431112233',
    telegram: 'bauman_optic',
    hours: '10:00-21:00',
    source: 'public',
    partnerStatus: 'listed',
  },
];
