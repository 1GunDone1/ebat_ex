const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Настройка подключения к PostgreSQL
const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '1234',
    port: 5432,
});

// Базовый маршрут для проверки работы сервера
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API для продукции
app.get('/api/products', async (req, res) => {
    console.log('Запрос продукции...'); // Логирование
    try {
        const { rows } = await pool.query(`
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM product_materials pm WHERE pm.product_id = p.product_id) AS materials_count
            FROM products p
            ORDER BY p.product_id
        `);
        console.log(`Найдено продуктов: ${rows.length}`); // Отладка
        res.json(rows);
    } catch (err) {
        console.error('Ошибка запроса продукции:', {
            message: err.message,
            stack: err.stack,
            code: err.code,
            detail: err.detail
        });
        res.status(500).json({ 
            error: 'Database error',
            details: err.message 
        });
    }
});

app.post('/api/products', async (req, res) => {
    const { product_name, product_code, width_cm, length_cm, thickness_mm, price_per_roll, production_time_days, description } = req.body;
    
    try {
        const { rows } = await pool.query(
            'INSERT INTO products (product_name, product_code, width_cm, length_cm, thickness_mm, price_per_roll, production_time_days, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [product_name, product_code, width_cm, length_cm, thickness_mm, price_per_roll, production_time_days, description]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { product_name, product_code, width_cm, length_cm, thickness_mm, price_per_roll, production_time_days, description } = req.body;
    
    try {
        const { rows } = await pool.query(
            'UPDATE products SET product_name = $1, product_code = $2, width_cm = $3, length_cm = $4, thickness_mm = $5, price_per_roll = $6, production_time_days = $7, description = $8 WHERE product_id = $9 RETURNING *',
            [product_name, product_code, width_cm, length_cm, thickness_mm, price_per_roll, production_time_days, description, id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query('DELETE FROM products WHERE product_id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    console.log(`Запрос продукта с ID: ${req.params.id}`);
    try {
        const { rows } = await pool.query(
            'SELECT * FROM products WHERE product_id = $1', 
            [req.params.id]
        );
        
        if (rows.length === 0) {
            console.log('Продукт не найден');
            return res.status(404).json({ 
                error: 'Product not found',
                details: `Product with ID ${req.params.id} not found`
            });
        }
        
        console.log('Найден продукт:', rows[0]);
        res.json(rows[0]);
    } catch (err) {
        console.error('Ошибка базы данных:', {
            message: err.message,
            stack: err.stack,
            query: err.query
        });
        res.status(500).json({ 
            error: 'Database error',
            details: err.message
        });
    }
});

// API для материалов
app.get('/api/materials', async (req, res) => {
    console.log('Запрос материалов...'); // Логирование
    try {
        const { rows } = await pool.query(`
            SELECT * FROM materials 
            ORDER BY material_id
        `);
        console.log(`Найдено материалов: ${rows.length}`); // Отладка
        res.json(rows);
    } catch (err) {
        console.error('Ошибка запроса материалов:', {
            message: err.message,
            stack: err.stack,
            code: err.code
        });
        res.status(500).json({ 
            error: 'Database error',
            details: err.message 
        });
    }
});

app.post('/api/materials', async (req, res) => {
    const { material_name, material_type, unit_price, supplier, description } = req.body;
    
    try {
        const { rows } = await pool.query(
            'INSERT INTO materials (material_name, material_type, unit_price, supplier, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [material_name, material_type, unit_price, supplier, description]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/materials/:id', async (req, res) => {
    const { id } = req.params;
    const { material_name, material_type, unit_price, supplier, description } = req.body;
    
    try {
        const { rows } = await pool.query(
            'UPDATE materials SET material_name = $1, material_type = $2, unit_price = $3, supplier = $4, description = $5 WHERE material_id = $6 RETURNING *',
            [material_name, material_type, unit_price, supplier, description, id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Material not found' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/materials/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query('DELETE FROM materials WHERE material_id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/materials/:id', async (req, res) => {
    console.log(`Запрос материала с ID: ${req.params.id}`);
    try {
        const { rows } = await pool.query(
            'SELECT * FROM materials WHERE material_id = $1', 
            [req.params.id]
        );
        
        if (rows.length === 0) {
            console.log('Материал не найден');
            return res.status(404).json({ 
                error: 'Material not found',
                details: `Material with ID ${req.params.id} not found`
            });
        }
        
        console.log('Найден материал:', rows[0]);
        res.json(rows[0]);
    } catch (err) {
        console.error('Ошибка базы данных:', {
            message: err.message,
            stack: err.stack,
            query: err.query
        });
        res.status(500).json({ 
            error: 'Database error',
            details: err.message
        });
    }
});

// API для материалов продукта
app.get('/api/products/:id/materials', async (req, res) => {
    const { id } = req.params;
    
    try {
        const { rows } = await pool.query(
            'SELECT pm.*, m.material_name FROM product_materials pm JOIN materials m ON pm.material_id = m.material_id WHERE pm.product_id = $1',
            [id]
        );
        res.json(rows);
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