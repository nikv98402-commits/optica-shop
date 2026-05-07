import { Product } from '../types';

export const demoProducts: Product[] = [
  {
    id: 'aurora-crystal',
    name: 'Aurora Crystal',
    description: 'Легкая прозрачная оправа из ацетата с антибликовым покрытием и мягкой посадкой для ежедневной работы за экраном.',
    price: 12990,
    category: 'eyeglasses',
    brand_type: 'our_brand',
    brand_name: 'VisionLux Atelier',
    image_url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=900&q=80',
    stock: 18,
    featured: true,
    created_at: '2026-04-20T10:00:00.000Z',
  },
  {
    id: 'noir-line',
    name: 'Noir Line',
    description: 'Графичная черная оправа с тонким профилем. Хорошо держит форму и подходит для сильных диоптрий.',
    price: 15490,
    category: 'eyeglasses',
    brand_type: 'partner_brand',
    brand_name: 'Maison Optique',
    image_url: 'https://images.unsplash.com/photo-1509695507497-903c140c43b0?auto=format&fit=crop&w=900&q=80',
    stock: 12,
    featured: true,
    created_at: '2026-04-18T10:00:00.000Z',
  },
  {
    id: 'solstice-honey',
    name: 'Solstice Honey',
    description: 'Солнцезащитные очки в теплом медовом оттенке с линзами UV400 и поляризацией для яркого города и отпуска.',
    price: 18990,
    category: 'sunglasses',
    brand_type: 'our_brand',
    brand_name: 'VisionLux Sun',
    image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80',
    stock: 9,
    featured: true,
    created_at: '2026-04-16T10:00:00.000Z',
  },
  {
    id: 'polar-drive',
    name: 'Polar Drive',
    description: 'Матовая стальная оправа с поляризацией, созданная для вождения и долгих прогулок без бликов.',
    price: 21990,
    category: 'sunglasses',
    brand_type: 'partner_brand',
    brand_name: 'North Lens',
    image_url: 'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=900&q=80',
    stock: 7,
    featured: false,
    created_at: '2026-04-14T10:00:00.000Z',
  },
  {
    id: 'daily-air-plus',
    name: 'Daily Air Plus',
    description: 'Однодневные контактные линзы с высокой кислородопроницаемостью и увлажнением на весь день.',
    price: 3490,
    subscription_price: 2960,
    category: 'contact_lenses',
    brand_type: 'our_brand',
    brand_name: 'VisionLux Care',
    image_url: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=900&q=80',
    stock: 42,
    featured: true,
    created_at: '2026-04-12T10:00:00.000Z',
  },
  {
    id: 'comfort-monthly',
    name: 'Comfort Monthly',
    description: 'Месячные линзы для стабильного зрения, мягкой посадки и удобной подписки с доставкой.',
    price: 4190,
    subscription_price: 3560,
    category: 'contact_lenses',
    brand_type: 'partner_brand',
    brand_name: 'ClearDay',
    image_url: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=900&q=80',
    stock: 31,
    featured: false,
    created_at: '2026-04-10T10:00:00.000Z',
  },
];

export function formatPrice(price: number) {
  return `${price.toLocaleString('ru-RU')} ₽`;
}

export function getProductById(productId: string) {
  return demoProducts.find((product) => product.id === productId);
}
