export interface PilotOptic {
  id: string;
  name: string;
  address: string;
  phone: string;
  messenger: string;
  hours: string;
}

export interface PilotFrame {
  id: string;
  opticId: string;
  category: 'eyeglasses' | 'sunglasses';
  brand: string;
  model: string;
  color: string;
  price: number;
  size: string;
  material: string;
  inStock: boolean;
  imageUrl?: string;
  frameColor: string;
  lensTone: string;
}

export const pilotOptics: PilotOptic[] = [
  {
    id: 'visionlux-pilot',
    name: 'ViLu Pilot',
    address: 'ТЦ Атриум, 1 этаж',
    phone: '+7 999 000-00-00',
    messenger: 'WhatsApp / Telegram',
    hours: '10:00-22:00',
  },
  {
    id: 'north-optic',
    name: 'North Optic',
    address: 'ул. Лесная, 14',
    phone: '+7 999 111-22-33',
    messenger: 'WhatsApp',
    hours: '09:00-21:00',
  },
];

export const pilotFrames: PilotFrame[] = [
  {
    id: 'pilot-aurora',
    opticId: 'visionlux-pilot',
    category: 'eyeglasses',
    brand: 'ViLu Atelier',
    model: 'Aurora Crystal',
    color: 'Прозрачный кристалл',
    price: 12990,
    size: '49-19-140',
    material: 'ацетат',
    inStock: true,
    frameColor: '#f4efe5',
    lensTone: 'rgba(255,255,255,0.24)',
  },
  {
    id: 'pilot-noir',
    opticId: 'visionlux-pilot',
    category: 'eyeglasses',
    brand: 'Maison Optique',
    model: 'Noir Line',
    color: 'Графитовый черный',
    price: 15490,
    size: '51-18-145',
    material: 'титан',
    inStock: true,
    frameColor: '#111827',
    lensTone: 'rgba(255,255,255,0.16)',
  },
  {
    id: 'pilot-honey',
    opticId: 'visionlux-pilot',
    category: 'sunglasses',
    brand: 'ViLu Sun',
    model: 'Solstice Honey',
    color: 'Медовый',
    price: 18990,
    size: '52-20-145',
    material: 'ацетат',
    inStock: true,
    frameColor: '#b77935',
    lensTone: 'rgba(89,52,20,0.32)',
  },
  {
    id: 'pilot-polar',
    opticId: 'visionlux-pilot',
    category: 'sunglasses',
    brand: 'North Lens',
    model: 'Polar Drive',
    color: 'Матовая сталь',
    price: 21990,
    size: '54-18-145',
    material: 'металл',
    inStock: true,
    frameColor: '#64748b',
    lensTone: 'rgba(15,23,42,0.26)',
  },
  {
    id: 'pilot-softline',
    opticId: 'visionlux-pilot',
    category: 'eyeglasses',
    brand: 'Clear Form',
    model: 'Softline 42',
    color: 'Пыльная роза',
    price: 11990,
    size: '48-18-140',
    material: 'ацетат',
    inStock: true,
    frameColor: '#c08497',
    lensTone: 'rgba(255,255,255,0.2)',
  },
  {
    id: 'pilot-boston',
    opticId: 'visionlux-pilot',
    category: 'eyeglasses',
    brand: 'Urban Reader',
    model: 'Boston Work',
    color: 'Темная черепаха',
    price: 13990,
    size: '50-20-145',
    material: 'ацетат',
    inStock: true,
    frameColor: '#5b3a29',
    lensTone: 'rgba(255,255,255,0.18)',
  },
];
