export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  subscription_price?: number; // Сделали необязательным
  category: 'sunglasses' | 'contact_lenses' | 'eyeglasses';
  brand_type: 'our_brand' | 'partner_brand';
  brand_name: string;
  image_url: string;
  stock: number;
  featured: boolean;
  created_at: string;
}