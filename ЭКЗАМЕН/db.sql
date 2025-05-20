CREATE DATABASE wallpaper_company;

-- Подключаемся к базе данных
\c wallpaper_company

-- Создаем таблицу материалов
CREATE TABLE materials (
    material_id SERIAL PRIMARY KEY,
    material_name VARCHAR(100) NOT NULL,
    material_type VARCHAR(50) NOT NULL CHECK (material_type IN ('основа', 'покрытие', 'другое')),
    description TEXT,
    unit_price DECIMAL(10, 2) NOT NULL,
    supplier VARCHAR(100)
);

-- Создаем таблицу продукции
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    product_code VARCHAR(20) UNIQUE NOT NULL,
    width_cm INT NOT NULL,
    length_cm INT NOT NULL,
    thickness_mm DECIMAL(5, 2) NOT NULL,
    price_per_roll DECIMAL(10, 2) NOT NULL,
    production_time_days INT DEFAULT 3,
    description TEXT
);

-- Создаем таблицу связи продукции и материалов (многие-ко-многим)
CREATE TABLE product_materials (
    product_id INT REFERENCES products(product_id) ON DELETE CASCADE,
    material_id INT REFERENCES materials(material_id) ON DELETE CASCADE,
    material_usage VARCHAR(50) NOT NULL CHECK (material_usage IN ('основа', 'покрытие', 'другое')),
    quantity_per_unit DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (product_id, material_id, material_usage)
);

-- Вставляем тестовые данные
INSERT INTO materials (material_name, material_type, description, unit_price, supplier) VALUES
('Флизелин', 'основа', 'Нетканый материал из целлюлозных волокон', 15.50, 'ООО Текстиль'),
('Винил', 'покрытие', 'ПВХ покрытие с различными текстурами', 22.75, 'ЗАО Полимеры'),
('Бумага', 'основа', 'Плотная бумага для печати', 8.30, 'ОАО Бумага'),
('Акрил', 'покрытие', 'Водостойкое акриловое покрытие', 18.90, 'ИП Химия'),
('Текстиль', 'покрытие', 'Натуральные тканевые волокна', 35.20, 'ООО Текстиль');

INSERT INTO products (product_name, product_code, width_cm, length_cm, thickness_mm, price_per_roll, description) VALUES
('Классика', 'WALL-001', 53, 1000, 0.45, 1200.00, 'Флизелиновые обои под покраску'),
('Премиум', 'WALL-005', 70, 1000, 0.65, 2500.00, 'Виниловые обои с рельефным рисунком'),
('Эко', 'WALL-010', 53, 1000, 0.35, 950.00, 'Бумажные обои с натуральными красителями');

INSERT INTO product_materials (product_id, material_id, material_usage, quantity_per_unit) VALUES
(1, 1, 'основа', 1.2),
(1, 4, 'покрытие', 0.8),
(2, 1, 'основа', 1.5),
(2, 2, 'покрытие', 1.2),
(3, 3, 'основа', 1.0),
(3, 5, 'покрытие', 0.5);