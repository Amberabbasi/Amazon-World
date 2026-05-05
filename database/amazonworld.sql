-- AmazonWorld MySQL Schema (Hostinger shared hosting)
-- Import this in phpMyAdmin.

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('active','frozen','blocked') NOT NULL DEFAULT 'active',
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wallets (
  user_id BIGINT UNSIGNED NOT NULL,
  balance_usdt DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  profit_usdt DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  credit_score INT NOT NULL DEFAULT 100,
  updated_at TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  price_usdt DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  image_path VARCHAR(255) NOT NULL DEFAULT '',
  commission_mode ENUM('buy','sell','both') NOT NULL DEFAULT 'both',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bought_products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  buy_price_usdt DECIMAL(18,2) NOT NULL,
  commission_mode ENUM('buy','sell','both') NOT NULL DEFAULT 'both',
  bought_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_bought_user (user_id),
  KEY idx_bought_product (product_id),
  CONSTRAINT fk_bought_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_bought_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('buy','sell','withdraw','deposit','adjustment') NOT NULL,
  product_id BIGINT UNSIGNED NULL,
  amount_usdt DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  my_commission_usdt DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  platform_commission_usdt DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  net_balance_impact_usdt DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tx_user (user_id),
  KEY idx_tx_type (type),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tx_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS withdraw_requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  amount_usdt DECIMAL(18,2) NOT NULL,
  address VARCHAR(255) NOT NULL,
  network VARCHAR(50) NOT NULL DEFAULT 'USDT-TRC20',
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wr_user (user_id),
  CONSTRAINT fk_wr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed products (optional). You can edit these from phpMyAdmin anytime.
INSERT INTO products (name, description, price_usdt, image_path, commission_mode) VALUES
('Wireless Headphones','Noise cancellation and long battery.',59.99,'img/wireless-headphones.jpg','buy'),
('Smart Watch','Health tracking smartwatch.',39.50,'img/smart-watch.jpg','buy'),
('Office Chair','Ergonomic chair.',89.00,'img/office-chair.jpg','buy'),
('Android Tablet','10-inch tablet.',210.00,'img/android-tablet.jpg','buy'),
('Mechanical Keyboard','RGB mechanical keyboard.',120.00,'img/mechanical-keyboard.jpg','buy'),
('Action Camera','4K action camera.',280.00,'img/action-camera.jpg','buy'),
('Wi-Fi Router','Dual-band router.',95.00,'img/wifi-router.jpg','buy'),
('27 Inch Monitor','Full HD monitor.',260.00,'img/27-inch-monitor.jpg','buy'),
('Laser Printer','Office printer.',720.00,'img/laser-printer.jpg','buy'),
('Mini Drone','Portable drone.',180.00,'img/mini-drone.jpg','buy'),
('Gaming Laptop Pro','High performance laptop.',1499.00,'img/gaming-laptop-pro.jpg','buy'),
('Flagship Smartphone','Premium smartphone.',999.00,'img/flagship-smartphone.jpg','buy'),
('Deluxe Espresso Machine','Coffee machine.',619.00,'img/deluxe-espresso-machine.jpg','buy'),
('Rice Cooker','Sell commission product.',70.00,'img/rice-cooker.jpg','sell'),
('Robot Vacuum','Sell commission product.',780.00,'img/robot-vacuum.jpg','sell'),
('Air Fryer','Sell commission product.',140.00,'img/air-fryer.jpg','sell'),
('Juicer Blender','Sell commission product.',110.00,'img/juicer-blender.jpg','sell'),
('Microwave Oven','Sell commission product.',950.00,'img/microwave-oven.jpg','sell'),
('Game Console','Buy & sell commission product.',799.00,'img/game-console.jpg','both'),
('Ultrabook Laptop','Buy & sell commission product.',1299.00,'img/ultrabook-laptop.jpg','both'),
('Water Cooler','Buy & sell commission product.',290.00,'img/water-cooler.jpg','both'),
('Smart Projector','Buy & sell commission product.',890.00,'img/smart-projector.jpg','both'),
('Inverter AC','Buy & sell commission product.',1450.00,'img/inverter-ac.jpg','both');

