/*
  # Optical E-commerce Schema

  ## Overview
  Complete database schema for high-end optical e-commerce platform with retail and subscription models.

  ## New Tables
  
  ### products
  - `id` (uuid, primary key) - Unique product identifier
  - `name` (text) - Product name
  - `description` (text) - Detailed product description
  - `price` (decimal) - Base retail price
  - `subscription_price` (decimal, nullable) - Monthly subscription price if applicable
  - `category` (text) - Product category: 'sunglasses', 'contact_lenses', 'eyeglasses'
  - `brand_type` (text) - Brand classification: 'our_brand', 'partner_brand'
  - `brand_name` (text) - Actual brand name
  - `image_url` (text) - Product image URL
  - `stock` (integer) - Available inventory
  - `featured` (boolean) - Featured on homepage
  - `created_at` (timestamptz) - Record creation timestamp

  ### vision_profiles
  - `id` (uuid, primary key) - Unique profile identifier
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `sph_left` (decimal, nullable) - Sphere value for left eye
  - `sph_right` (decimal, nullable) - Sphere value for right eye
  - `cyl_left` (decimal, nullable) - Cylinder value for left eye
  - `cyl_right` (decimal, nullable) - Cylinder value for right eye
  - `axis_left` (integer, nullable) - Axis for left eye
  - `axis_right` (integer, nullable) - Axis for right eye
  - `last_checkup` (date, nullable) - Date of last eye examination
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### subscriptions
  - `id` (uuid, primary key) - Unique subscription identifier
  - `user_id` (uuid, foreign key) - Reference to auth.users
  - `product_id` (uuid, foreign key) - Reference to products
  - `plan_type` (text) - Subscription type: 'monthly', 'quarterly', 'annual'
  - `status` (text) - Subscription status: 'active', 'paused', 'cancelled'
  - `price` (decimal) - Subscription price
  - `started_at` (timestamptz) - Subscription start date
  - `next_billing_date` (timestamptz) - Next billing date
  - `cancelled_at` (timestamptz, nullable) - Cancellation date
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable RLS on all tables
  - Public can read products
  - Users can read/update their own vision profiles
  - Users can read/manage their own subscriptions
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price decimal(10,2) NOT NULL,
  subscription_price decimal(10,2),
  category text NOT NULL CHECK (category IN ('sunglasses', 'contact_lenses', 'eyeglasses')),
  brand_type text NOT NULL CHECK (brand_type IN ('our_brand', 'partner_brand')),
  brand_name text NOT NULL,
  image_url text NOT NULL,
  stock integer DEFAULT 0,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create vision_profiles table
CREATE TABLE IF NOT EXISTS vision_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sph_left decimal(4,2),
  sph_right decimal(4,2),
  cyl_left decimal(4,2),
  cyl_right decimal(4,2),
  axis_left integer CHECK (axis_left >= 0 AND axis_left <= 180),
  axis_right integer CHECK (axis_right >= 0 AND axis_right <= 180),
  last_checkup date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  plan_type text NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'annual')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  price decimal(10,2) NOT NULL,
  started_at timestamptz DEFAULT now(),
  next_billing_date timestamptz NOT NULL,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE vision_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Products policies (public read access)
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

-- Vision profiles policies
CREATE POLICY "Users can view own vision profile"
  ON vision_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vision profile"
  ON vision_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vision profile"
  ON vision_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert sample products
INSERT INTO products (name, description, price, subscription_price, category, brand_type, brand_name, image_url, stock, featured) VALUES
  ('Classic Aviator', 'Timeless aviator sunglasses with UV protection', 145.00, NULL, 'sunglasses', 'our_brand', 'VisionLux', 'https://images.pexels.com/photos/701877/pexels-photo-701877.jpeg?auto=compress&cs=tinysrgb&w=800', 50, true),
  ('Minimalist Round', 'Sleek round frame sunglasses for everyday wear', 135.00, NULL, 'sunglasses', 'our_brand', 'VisionLux', 'https://images.pexels.com/photos/1627639/pexels-photo-1627639.jpeg?auto=compress&cs=tinysrgb&w=800', 45, true),
  ('Urban Square', 'Bold square frames with premium lenses', 155.00, NULL, 'sunglasses', 'partner_brand', 'SunStyle Co', 'https://images.pexels.com/photos/2690323/pexels-photo-2690323.jpeg?auto=compress&cs=tinysrgb&w=800', 30, false),
  ('Daily Comfort Lenses', 'Premium daily contact lenses with moisture lock technology', 30.00, 25.00, 'contact_lenses', 'our_brand', 'VisionLux', 'https://images.pexels.com/photos/5752288/pexels-photo-5752288.jpeg?auto=compress&cs=tinysrgb&w=800', 200, true),
  ('Extended Wear Lenses', 'Monthly contact lenses for extended comfort', 35.00, 28.00, 'contact_lenses', 'partner_brand', 'ClearView', 'https://images.pexels.com/photos/5855755/pexels-photo-5855755.jpeg?auto=compress&cs=tinysrgb&w=800', 150, false),
  ('Designer Acetate Frames', 'Handcrafted acetate eyeglasses with spring hinges', 195.00, NULL, 'eyeglasses', 'our_brand', 'VisionLux', 'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=800', 40, false),
  ('Retro Cat Eye', 'Vintage-inspired cat eye sunglasses', 140.00, NULL, 'sunglasses', 'our_brand', 'VisionLux', 'https://images.pexels.com/photos/2690323/pexels-photo-2690323.jpeg?auto=compress&cs=tinysrgb&w=800', 35, true),
  ('Sport Performance', 'High-performance sunglasses for active lifestyles', 165.00, NULL, 'sunglasses', 'partner_brand', 'ActiveVision', 'https://images.pexels.com/photos/701877/pexels-photo-701877.jpeg?auto=compress&cs=tinysrgb&w=800', 25, false)
ON CONFLICT DO NOTHING;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand_type ON products(brand_type);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured);
CREATE INDEX IF NOT EXISTS idx_vision_profiles_user_id ON vision_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);