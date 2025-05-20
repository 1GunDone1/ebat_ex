const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Настройка подключения к SQLite
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('Подключено к SQLite базе данных');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Создание таблиц, если они не существуют
        db.run(`
            CREATE TABLE IF NOT EXISTS "Продукт" (
                "Код" INTEGER PRIMARY KEY AUTOINCREMENT,
                "Название" TEXT NOT NULL
            )
        `);
        
        db.run(`
            CREATE TABLE IF NOT EXISTS "Материал" (
                "Код" INTEGER PRIMARY KEY AUTOINCREMENT,
                "Название" TEXT NOT NULL,
                "Стоимость" INTEGER
            )
        `);
        
        db.run(`
            CREATE TABLE IF NOT EXISTS "ПродуктМатериал" (
                "ПродуктКод" INTEGER,
                "МатериалКод" INTEGER,
                "Код" INTEGER PRIMARY KEY AUTOINCREMENT,
                "Количество" INTEGER NOT NULL,
                FOREIGN KEY ("ПродуктКод") REFERENCES "Продукт"("Код"),
                FOREIGN KEY ("МатериалКод") REFERENCES "Материал"("Код")
            )
        `);
    });
}

// Базовый маршрут
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Вспомогательная функция для работы с промисами
function dbAll(query, params = []) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function dbRun(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function dbGet(query, params = []) {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// API для продукции
app.get('/api/products', async (req, res) => {
    try {
        const products = await dbAll(`
            SELECT 
                p.*,
                (SELECT COUNT(*) FROM ПродуктМатериал pm WHERE pm.ПродуктКод = p.Код) AS materials_count
            FROM Продукт p
            ORDER BY p.Код
        `);
        res.json(products);
    } catch (err) {
        console.error('Ошибка запроса продукции:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { Название } = req.body;
    
    try {
        const result = await dbRun(
            'INSERT INTO Продукт (Название) VALUES (?)',
            [Название]
        );
        const newProduct = await dbGet('SELECT * FROM Продукт WHERE Код = ?', [result.lastID]);
        res.status(201).json(newProduct);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { Название } = req.body;
    
    try {
        await dbRun(
            'UPDATE Продукт SET Название = ? WHERE Код = ?',
            [Название, id]
        );
        
        const updatedProduct = await dbGet('SELECT * FROM Продукт WHERE Код = ?', [id]);
        
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
    const { id } = req.params;
    
    try {
        await dbRun('DELETE FROM Продукт WHERE Код = ?', [id]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await dbGet(
            'SELECT * FROM Продукт WHERE Код = ?', 
            [req.params.id]
        );
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(product);
    } catch (err) {
        console.error('Ошибка базы данных:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// API для материалов
app.get('/api/materials', async (req, res) => {
    try {
        const materials = await dbAll(`
            SELECT 
                m.*,
                (SELECT COUNT(*) FROM ПродуктМатериал pm WHERE pm.МатериалКод = m.Код) AS product_count
            FROM Материал m
            ORDER BY m.Код
        `);
        res.json(materials);
    } catch (err) {
        console.error('Ошибка запроса материалов:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.post('/api/materials', async (req, res) => {
    const { Название, Стоимость } = req.body;
    
    try {
        const result = await dbRun(
            'INSERT INTO Материал (Название, Стоимость) VALUES (?, ?)',
            [Название, Стоимость]
        );
        const newMaterial = await dbGet('SELECT * FROM Материал WHERE Код = ?', [result.lastID]);
        res.status(201).json(newMaterial);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/api/materials/:id', async (req, res) => {
    const { id } = req.params;
    const { Название, Стоимость } = req.body;
    
    try {
        await dbRun(
            'UPDATE Материал SET Название = ?, Стоимость = ? WHERE Код = ?',
            [Название, Стоимость, id]
        );
        
        const updatedMaterial = await dbGet('SELECT * FROM Материал WHERE Код = ?', [id]);
        
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
    const { id } = req.params;
    
    try {
        await dbRun('DELETE FROM Материал WHERE Код = ?', [id]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/materials/:id', async (req, res) => {
    try {
        const material = await dbGet(
            'SELECT * FROM Материал WHERE Код = ?', 
            [req.params.id]
        );
        
        if (!material) {
            return res.status(404).json({ error: 'Material not found' });
        }
        
        res.json(material);
    } catch (err) {
        console.error('Ошибка базы данных:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// API для материалов продукта
app.get('/api/products/:id/materials', async (req, res) => {
    const { id } = req.params;
    
    try {
        const materials = await dbAll(
            'SELECT pm.*, m.Название FROM ПродуктМатериал pm JOIN Материал m ON pm.МатериалКод = m.Код WHERE pm.ПродуктКод = ?',
            [id]
        );
        res.json(materials);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/products/:id/materials', async (req, res) => {
    const { id } = req.params;
    const { МатериалКод, Количество } = req.body;
    
    try {
        const result = await dbRun(
            'INSERT INTO ПродуктМатериал (ПродуктКод, МатериалКод, Количество) VALUES (?, ?, ?)',
            [id, МатериалКод, Количество]
        );
        const newProductMaterial = await dbGet('SELECT * FROM ПродуктМатериал WHERE Код = ?', [result.lastID]);
        res.status(201).json(newProductMaterial);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/products/:productId/materials/:materialId', async (req, res) => {
    const { productId, materialId } = req.params;
    
    try {
        await dbRun(
            'DELETE FROM ПродуктМатериал WHERE ПродуктКод = ? AND МатериалКод = ?',
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

// Закрытие соединения с БД при завершении процесса
process.on('SIGINT', () => {
    db.close();
    process.exit();
});