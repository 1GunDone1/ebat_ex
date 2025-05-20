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

// Базовый маршрут
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API для продукции
app.get('/api/products', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM ПродуктМатериал pm WHERE pm.ПродуктКод = p.Код) AS materials_count
            FROM Продукт p
            ORDER BY p.Код
        `);
        res.json(rows);
    } catch (err) {
        console.error('Ошибка запроса продукции:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { Название } = req.body;
    
    try {
        const { rows } = await pool.query(
            'INSERT INTO Продукт (Название) VALUES ($1) RETURNING *',
            [Название]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { Название } = req.body;
    
    try {
        const { rows } = await pool.query(
            'UPDATE Продукт SET Название = $1 WHERE Код = $2 RETURNING *',
            [Название, id]
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
        await pool.query('DELETE FROM Продукт WHERE Код = $1', [id]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM Продукт WHERE Код = $1', 
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Ошибка базы данных:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// API для материалов
app.get('/api/materials', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                m.*,
                (SELECT COUNT(*) FROM ПродуктМатериал pm WHERE pm.МатериалКод = m.Код) AS product_count
            FROM Материал m
            ORDER BY m.Код
        `);
        res.json(rows);
    } catch (err) {
        console.error('Ошибка запроса материалов:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/materials', async (req, res) => {
    const { Название, Стоимость } = req.body;
    
    try {
        const { rows } = await pool.query(
            'INSERT INTO Материал (Название, Стоимость) VALUES ($1, $2) RETURNING *',
            [Название, Стоимость]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/materials/:id', async (req, res) => {
    const { id } = req.params;
    const { Название, Стоимость } = req.body;
    
    try {
        const { rows } = await pool.query(
            'UPDATE Материал SET Название = $1, Стоимость = $2 WHERE Код = $3 RETURNING *',
            [Название, Стоимость, id]
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
        await pool.query('DELETE FROM Материал WHERE Код = $1', [id]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/materials/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM Материал WHERE Код = $1', 
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Material not found' });
        }
        
        res.json(rows[0]);
    } catch (err) {
        console.error('Ошибка базы данных:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// API для материалов продукта
app.get('/api/products/:id/materials', async (req, res) => {
    const { id } = req.params;
    
    try {
        const { rows } = await pool.query(
            'SELECT pm.*, m.Название FROM ПродуктМатериал pm JOIN Материал m ON pm.МатериалКод = m.Код WHERE pm.ПродуктКод = $1',
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/products/:id/materials', async (req, res) => {
    const { id } = req.params;
    const { МатериалКод, Количество } = req.body;
    
    try {
        const { rows } = await pool.query(
            'INSERT INTO ПродуктМатериал (ПродуктКод, МатериалКод, Количество) VALUES ($1, $2, $3) RETURNING *',
            [id, МатериалКод, Количество]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/products/:productId/materials/:materialId', async (req, res) => {
    const { productId, materialId } = req.params;
    
    try {
        await pool.query(
            'DELETE FROM ПродуктМатериал WHERE ПродуктКод = $1 AND МатериалКод = $2',
            [productId, materialId]
        );
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