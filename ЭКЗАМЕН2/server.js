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
    try {
        const { rows } = await pool.query(`
            SELECT 
                p."Код" as product_id,
                p."Название" as product_name,
                (SELECT COUNT(*) FROM "ПродуктМатериал" pm WHERE pm."ПродуктКод" = p."Код") as materials_count
            FROM "Продукт" p
            ORDER BY p."Код"
        `);
        res.json(rows);
    } catch (err) {
        console.error('Ошибка запроса продукции:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { product_name } = req.body;
    
    try {
        const { rows } = await pool.query(
            'INSERT INTO "Продукт" ("Название") VALUES ($1) RETURNING "Код" as product_id, "Название" as product_name',
            [product_name]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { product_name } = req.body;
    
    try {
        const { rows } = await pool.query(
            'UPDATE "Продукт" SET "Название" = $1 WHERE "Код" = $2 RETURNING "Код" as product_id, "Название" as product_name',
            [product_name, id]
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
        await pool.query('DELETE FROM "Продукт" WHERE "Код" = $1', [id]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для материалов
app.get('/api/materials', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                m."Код" as material_id,
                m."Название" as material_name,
                m."Стоимость" as unit_price,
                (SELECT COUNT(*) FROM "ПродуктМатериал" pm WHERE pm."МатериалКод" = m."Код") as product_count
            FROM "Материал" m
            ORDER BY m."Код"
        `);
        res.json(rows);
    } catch (err) {
        console.error('Ошибка запроса материалов:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/materials', async (req, res) => {
    const { material_name, unit_price } = req.body;
    
    try {
        const { rows } = await pool.query(
            'INSERT INTO "Материал" ("Название", "Стоимость") VALUES ($1, $2) RETURNING "Код" as material_id, "Название" as material_name, "Стоимость" as unit_price',
            [material_name, unit_price]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/materials/:id', async (req, res) => {
    const { id } = req.params;
    const { material_name, unit_price } = req.body;
    
    try {
        const { rows } = await pool.query(
            'UPDATE "Материал" SET "Название" = $1, "Стоимость" = $2 WHERE "Код" = $3 RETURNING "Код" as material_id, "Название" as material_name, "Стоимость" as unit_price',
            [material_name, unit_price, id]
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
        await pool.query('DELETE FROM "Материал" WHERE "Код" = $1', [id]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// API для Продукт-Материалы
app.get('/api/product-materials', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                pm."Код" as id,
                pm."ПродуктКод" as product_id,
                pm."МатериалКод" as material_id,
                pm."Количество" as quantity_per_unit
            FROM "ПродуктМатериал" pm
            ORDER BY pm."Код"
        `);
        res.json(rows);
    } catch (err) {
        console.error('Ошибка запроса связей:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/product-materials', async (req, res) => {
    const { product_id, material_id, quantity_per_unit } = req.body;
    
    try {
        const { rows } = await pool.query(
            'INSERT INTO "ПродуктМатериал" ("ПродуктКод", "МатериалКод", "Количество") VALUES ($1, $2, $3) RETURNING "Код" as id, "ПродуктКод" as product_id, "МатериалКод" as material_id, "Количество" as quantity_per_unit',
            [product_id, material_id, quantity_per_unit]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ 
            error: 'Internal server error',
            details: err.message 
        });
    }
});

app.put('/api/product-materials/:id', async (req, res) => {
    const { id } = req.params;
    const { product_id, material_id, quantity_per_unit } = req.body;
    
    try {
        const { rows } = await pool.query(
            'UPDATE "ПродуктМатериал" SET "ПродуктКод" = $1, "МатериалКод" = $2, "Количество" = $3 WHERE "Код" = $4 RETURNING "Код" as id, "ПродуктКод" as product_id, "МатериалКод" as material_id, "Количество" as quantity_per_unit',
            [product_id, material_id, quantity_per_unit, id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/product-materials/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query('DELETE FROM "ПродуктМатериал" WHERE "Код" = $1', [id]);
        res.status(204).send();
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