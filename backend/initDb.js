/**
 * Initialize SQLite database and seed sample data (using sql.js, no native bindings)
 */
import initSqlJs from 'sql.js';
import { writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'catalogue.db');

export const schema = `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_id INTEGER DEFAULT NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    category_id INTEGER NOT NULL,
    brand TEXT,
    image TEXT,
    images TEXT,
    popularity INTEGER DEFAULT 0,
    attributes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );
  CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, product_id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS view_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    author TEXT,
    rating INTEGER DEFAULT 5,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
`;

async function main() {
  const SQL = await initSqlJs({
    locateFile: (file) => join(__dirname, 'node_modules', 'sql.js', 'dist', file),
  });
  const db = new SQL.Database();
  db.exec(schema);

  db.run(`INSERT OR IGNORE INTO categories (id, name, slug, parent_id) VALUES (1, 'لباس', 'clothing', NULL)`);
  db.run(`INSERT OR IGNORE INTO categories (id, name, slug, parent_id) VALUES (2, 'مردانه', 'mens', 1)`);
  db.run(`INSERT OR IGNORE INTO categories (id, name, slug, parent_id) VALUES (3, 'زنانه', 'womens', 1)`);
  db.run(`INSERT OR IGNORE INTO categories (id, name, slug, parent_id) VALUES (4, 'پیراهن', 'shirt', 2)`);
  db.run(`INSERT OR IGNORE INTO categories (id, name, slug, parent_id) VALUES (5, 'شلوار', 'pants', 2)`);
  db.run(`INSERT OR IGNORE INTO categories (id, name, slug, parent_id) VALUES (6, 'لوازم الکترونیک', 'electronics', NULL)`);
  db.run(`INSERT OR IGNORE INTO categories (id, name, slug, parent_id) VALUES (7, 'موبایل', 'mobile', 6)`);
  db.run(`INSERT OR IGNORE INTO categories (id, name, slug, parent_id) VALUES (8, 'لپ‌تاپ', 'laptop', 6)`);

  const productImage = '/images/product-default.png';
  const products = [
    [1, 'پیراهن مردانه کلاسیک', 'mens-classic-shirt', 'پیراهن مردانه با پارچه مرغوب و دوخت دقیق. مناسب مجالس و محیط کار.', 299000, 50, 4, 'برند الف', productImage, 120, '{"color":"سفید","size":"M"}'],
    [2, 'شلوار جین مردانه', 'mens-jeans', 'شلوار جین با کیفیت بالا و رنگ ثابت.', 249000, 30, 5, 'برند ب', productImage, 95, '{"color":"آبی","size":"32"}'],
    [3, 'موبایل هوشمند X1', 'mobile-x1', 'گوشی هوشمند با دوربین ۴۸ مگاپیکسل و باتری ۵۰۰۰ میلی‌آمپر.', 8500000, 20, 7, 'سامسونگ', productImage, 200, '{"color":"مشکی","storage":"128GB"}'],
    [4, 'لپ‌تاپ ۱۵ اینچی', 'laptop-15', 'لپ‌تاپ سبک با پردازنده قدرتمند و رم ۱۶ گیگابایت.', 25000000, 10, 8, 'ایسوس', productImage, 80, '{"color":"نقره‌ای","ram":"16GB"}'],
    [5, 'پیراهن مردانه اسپرت', 'mens-sport-shirt', 'پیراهن اسپرت راحت برای روزهای گرم.', 189000, 45, 4, 'برند ج', productImage, 60, '{"color":"آبی","size":"L"}'],
    [6, 'بلوز زنانه', 'womens-blouse', 'بلوز زنانه با طراحی شیک و پارچه نخی.', 279000, 25, 3, 'برند د', productImage, 110, '{"color":"گلدار","size":"S"}'],
  ];
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (id, name, slug, description, price, stock, category_id, brand, image, popularity, attributes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const row of products) {
    insertProduct.bind(row);
    insertProduct.step();
    insertProduct.reset();
  }
  insertProduct.free();

  db.run(`INSERT OR IGNORE INTO admin_users (username, password_hash) VALUES ('admin', 'admin123')`);

  writeFileSync(dbPath, Buffer.from(db.export()));
  db.close();
  console.log('Database initialized and seeded.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
