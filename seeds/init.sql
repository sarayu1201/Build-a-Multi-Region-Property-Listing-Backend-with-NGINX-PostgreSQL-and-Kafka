-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id BIGINT PRIMARY KEY,
  price DECIMAL(12, 2) NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  region_origin VARCHAR(2) NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_region_origin ON properties(region_origin);
CREATE INDEX IF NOT EXISTS idx_updated_at ON properties(updated_at DESC);

-- Seed data: US region properties
INSERT INTO properties (id, price, bedrooms, bathrooms, region_origin) VALUES
  (1, 500000, 3, 2, 'us'),
  (2, 450000, 4, 2, 'us'),
  (3, 550000, 2, 2, 'us'),
  (4, 600000, 4, 3, 'us'),
  (5, 480000, 3, 2, 'us'),
  (6, 520000, 3, 2, 'us'),
  (7, 490000, 2, 1, 'us'),
  (8, 700000, 5, 3, 'us'),
  (9, 420000, 2, 1, 'us'),
  (10, 650000, 4, 3, 'us')
ON CONFLICT DO NOTHING;

-- Seed data: EU region properties
INSERT INTO properties (id, price, bedrooms, bathrooms, region_origin) VALUES
  (1001, 400000, 3, 2, 'eu'),
  (1002, 380000, 4, 2, 'eu'),
  (1003, 420000, 2, 1, 'eu'),
  (1004, 450000, 4, 3, 'eu'),
  (1005, 390000, 3, 2, 'eu'),
  (1006, 410000, 3, 2, 'eu'),
  (1007, 360000, 2, 1, 'eu'),
  (1008, 550000, 5, 3, 'eu'),
  (1009, 320000, 2, 1, 'eu'),
  (1010, 500000, 4, 3, 'eu')
ON CONFLICT DO NOTHING;
