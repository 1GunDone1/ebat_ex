const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

const DB_FILE = path.join(__dirname, 'db.db');

// Инициализация базы данных
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err.message);
  } else {
    console.log('Подключено к базе данных SQLite');
    initializeDatabase();
  }
});

// Функция для инициализации базы данных
function initializeDatabase() {
  db.serialize(() => {
    // Создаем таблицы, если они не существуют
    db.run(`
      CREATE TABLE IF NOT EXISTS materials (
        material_id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_name TEXT NOT NULL,
        material_type TEXT NOT NULL CHECK (material_type IN ('основа', 'покрытие', 'другое')),
        description TEXT,
        unit_price REAL NOT NULL,
        supplier TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        product_id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        product_code TEXT UNIQUE NOT NULL,
        width_cm INTEGER NOT NULL,
        length_cm INTEGER NOT NULL,
        thickness_mm REAL NOT NULL,
        price_per_roll REAL NOT NULL,
        production_time_days INTEGER DEFAULT 3,
        description TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS product_materials (
        product_id INTEGER,
        material_id INTEGER,
        material_usage TEXT NOT NULL CHECK (material_usage IN ('основа', 'покрытие', 'другое')),
        quantity_per_unit REAL NOT NULL,
        PRIMARY KEY (product_id, material_id, material_usage),
        FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES materials(material_id) ON DELETE CASCADE
      )
    `);

    // Вставляем тестовые данные, если таблицы пустые
    db.get("SELECT COUNT(*) as count FROM materials", (err, row) => {
      if (row.count === 0) {
        const materials = [
          ['Флизелин', 'основа', 'Нетканый материал из целлюлозных волокон', 15.50, 'ООО Текстиль'],
          ['Винил', 'покрытие', 'ПВХ покрытие с различными текстурами', 22.75, 'ЗАО Полимеры'],
          ['Бумага', 'основа', 'Плотная бумага для печати', 8.30, 'ОАО Бумага'],
          ['Акрил', 'покрытие', 'Водостойкое акриловое покрытие', 18.90, 'ИП Химия'],
          ['Текстиль', 'покрытие', 'Натуральные тканевые волокна', 35.20, 'ООО Текстиль']
        ];

        const stmt = db.prepare("INSERT INTO materials (material_name, material_type, description, unit_price, supplier) VALUES (?, ?, ?, ?, ?)");
        materials.forEach(m => stmt.run(m));
        stmt.finalize();
      }
    });

    db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
      if (row.count === 0) {
        const products = [
          ['Классика', 'WALL-001', 53, 1000, 0.45, 1200.00, 3, 'Флизелиновые обои под покраску'],
          ['Премиум', 'WALL-005', 70, 1000, 0.65, 2500.00, 3, 'Виниловые обои с рельефным рисунком'],
          ['Эко', 'WALL-010', 53, 1000, 0.35, 950.00, 3, 'Бумажные обои с натуральными красителями']
        ];

        const stmt = db.prepare("INSERT INTO products (product_name, product_code, width_cm, length_cm, thickness_mm, price_per_roll, production_time_days, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        products.forEach(p => stmt.run(p));
        stmt.finalize();
      }
    });

    db.get("SELECT COUNT(*) as count FROM product_materials", (err, row) => {
      if (row.count === 0) {
        const productMaterials = [
          [1, 1, 'основа', 1.2],
          [1, 4, 'покрытие', 0.8],
          [2, 1, 'основа', 1.5],
          [2, 2, 'покрытие', 1.2],
          [3, 3, 'основа', 1.0],
          [3, 5, 'покрытие', 0.5]
        ];

        const stmt = db.prepare("INSERT INTO product_materials (product_id, material_id, material_usage, quantity_per_unit) VALUES (?, ?, ?, ?)");
        productMaterials.forEach(pm => stmt.run(pm));
        stmt.finalize();
      }
    });
  });
}

// Обертка для работы с базой данных в стиле async/await
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Базовый маршрут для проверки работы сервера
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API для продукции
app.get('/api/products', async (req, res) => {
  try {
    const products = await dbAll(`
      SELECT p.*, COUNT(pm.material_id) as materials_count 
      FROM products p
      LEFT JOIN product_materials pm ON p.product_id = pm.product_id
      GROUP BY p.product_id
    `);
    res.json(products);
  } catch (err) {
    console.error('Ошибка запроса продукции:', err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { product_name, product_code, width_cm, length_cm, thickness_mm, 
            price_per_roll, production_time_days = 3, description } = req.body;
    
    const result = await dbRun(
      `INSERT INTO products (
        product_name, product_code, width_cm, length_cm, thickness_mm, 
        price_per_roll, production_time_days, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [product_name, product_code, width_cm, length_cm, thickness_mm, 
       price_per_roll, production_time_days, description]
    );
    
    const newProduct = await dbGet(
      'SELECT * FROM products WHERE product_id = ?',
      [result.lastID]
    );
    
    res.status(201).json(newProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { product_name, product_code, width_cm, length_cm, thickness_mm, 
            price_per_roll, production_time_days, description } = req.body;
    
    await dbRun(
      `UPDATE products SET 
        product_name = ?, product_code = ?, width_cm = ?, length_cm = ?, 
        thickness_mm = ?, price_per_roll = ?, production_time_days = ?, description = ?
       WHERE product_id = ?`,
      [product_name, product_code, width_cm, length_cm, thickness_mm, 
       price_per_roll, production_time_days, description, id]
    );
    
    const updatedProduct = await dbGet(
      'SELECT * FROM products WHERE product_id = ?',
      [id]
    );
    
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(updatedProduct);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await dbRun('DELETE FROM products WHERE product_id = ?', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await dbGet(
      'SELECT * FROM products WHERE product_id = ?',
      [req.params.id]
    );
    
    if (!product) {
      return res.status(404).json({ 
        error: 'Product not found',
        details: `Product with ID ${req.params.id} not found`
      });
    }
    
    res.json(product);
  } catch (err) {
    console.error('Ошибка базы данных:', err);
    res.status(500).json({ 
      error: 'Database error',
      details: err.message
    });
  }
});

// API для материалов
app.get('/api/materials', async (req, res) => {
  try {
    const materials = await dbAll(`
      SELECT m.*, COUNT(pm.product_id) as product_count 
      FROM materials m
      LEFT JOIN product_materials pm ON m.material_id = pm.material_id
      GROUP BY m.material_id
    `);
    res.json(materials);
  } catch (err) {
    console.error('Ошибка запроса материалов:', err);
    res.status(500).json({ 
      error: 'Database error',
      details: err.message 
    });
  }
});

app.post('/api/materials', async (req, res) => {
  try {
    const { material_name, material_type, unit_price, supplier, description } = req.body;
    
    const result = await dbRun(
      `INSERT INTO materials (
        material_name, material_type, unit_price, supplier, description
      ) VALUES (?, ?, ?, ?, ?)`,
      [material_name, material_type, unit_price, supplier, description]
    );
    
    const newMaterial = await dbGet(
      'SELECT * FROM materials WHERE material_id = ?',
      [result.lastID]
    );
    
    res.status(201).json(newMaterial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/materials/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { material_name, material_type, unit_price, supplier, description } = req.body;
    
    await dbRun(
      `UPDATE materials SET 
        material_name = ?, material_type = ?, unit_price = ?, supplier = ?, description = ?
       WHERE material_id = ?`,
      [material_name, material_type, unit_price, supplier, description, id]
    );
    
    const updatedMaterial = await dbGet(
      'SELECT * FROM materials WHERE material_id = ?',
      [id]
    );
    
    if (!updatedMaterial) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    res.json(updatedMaterial);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/materials/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await dbRun('DELETE FROM materials WHERE material_id = ?', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/materials/:id', async (req, res) => {
  try {
    const material = await dbGet(
      'SELECT * FROM materials WHERE material_id = ?',
      [req.params.id]
    );
    
    if (!material) {
      return res.status(404).json({ 
        error: 'Material not found',
        details: `Material with ID ${req.params.id} not found`
      });
    }
    
    res.json(material);
  } catch (err) {
    console.error('Ошибка базы данных:', err);
    res.status(500).json({ 
      error: 'Database error',
      details: err.message
    });
  }
});

// API для материалов продукта
app.get('/api/products/:id/materials', async (req, res) => {
  try {
    const productMaterials = await dbAll(`
      SELECT pm.*, m.material_name 
      FROM product_materials pm
      JOIN materials m ON pm.material_id = m.material_id
      WHERE pm.product_id = ?
    `, [req.params.id]);
    
    res.json(productMaterials);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обработка всех остальных маршрутов
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});

// Закрытие соединения с базой данных при завершении приложения
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Ошибка при закрытии базы данных:', err.message);
    } else {
      console.log('Соединение с базой данных закрыто');
    }
    process.exit(0);
  });
});