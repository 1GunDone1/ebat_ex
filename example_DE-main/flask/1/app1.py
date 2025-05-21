from flask import Flask, render_template, request, redirect, url_for
import sqlite3

app = Flask(__name__)

# Функция для подключения к БД
def get_db():
    conn = sqlite3.connect('db1')
    conn.row_factory = sqlite3.Row
    return conn

# Функция для расчета общего времени производства
def calculate_total_time(product_id):
    conn = get_db()
    total = conn.execute(
        'SELECT SUM(Время) as total FROM ПродуктЦех WHERE ПродуктКод = ?',
        (product_id,)
    ).fetchone()['total']
    conn.close()
    return total if total else 0

# Главная страница - просмотр продукции
@app.route('/')
def index():
    conn = get_db()
    products = conn.execute('SELECT * FROM products').fetchall()
    
    # Добавляем время производства к каждому продукту
    products_with_time = []
    for product in products:
        product = dict(product)
        product['total_time'] = calculate_total_time(product['id'])
        products_with_time.append(product)
    
    conn.close()
    return render_template('index.html', products=products_with_time)

# Страница редактирования продукта
@app.route('/edit/<int:id>', methods=['GET', 'POST'])
def edit_product(id):
    conn = get_db()
    
    if request.method == 'POST':
        new_title = request.form['title']
        if new_title.strip():
            conn.execute('UPDATE products SET title = ? WHERE id = ?', 
                        (new_title, id))
            conn.commit()
            conn.close()
            return redirect(url_for('index'))
    
    product = conn.execute('SELECT * FROM products WHERE id = ?', (id,)).fetchone()
    conn.close()
    return render_template('edit.html', product=product)

# Страница добавления нового продукта
@app.route('/add', methods=['GET', 'POST'])
def add_product():
    if request.method == 'POST':
        title = request.form['title']
        if title.strip():
            conn = get_db()
            conn.execute('INSERT INTO products (title) VALUES (?)', (title,))
            conn.commit()
            conn.close()
            return redirect(url_for('index'))
    
    return render_template('add.html')

if __name__ == '__main__':
    app.run(debug=True)