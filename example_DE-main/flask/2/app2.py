from flask import Flask, render_template, request, redirect, url_for
import sqlite3

app = Flask(__name__)

# Функция для создания подключения к базе данных
def get_db_connection():
    conn = sqlite3.connect('db2')
    conn.row_factory = sqlite3.Row
    return conn

# Функция для расчета стоимости продукции
def calculate_product_cost(product_id):
    conn = get_db_connection()
    query = """
    SELECT SUM(m.Стоимость * pm.Количество) as total_cost
    FROM ПродуктМатериал pm
    JOIN Материал m ON pm.МатериалКод = m.Код
    WHERE pm.ПродуктКод = ?
    """
    cost = conn.execute(query, (product_id,)).fetchone()['total_cost']
    conn.close()
    return cost if cost else 0

# Главная страница - просмотр продукции
@app.route('/')
def index():
    conn = get_db_connection()
    products = conn.execute('SELECT * FROM Продукт').fetchall()
    
    products_with_cost = []
    for product in products:
        product_dict = dict(product)
        product_dict['Стоимость'] = calculate_product_cost(product['Код'])
        products_with_cost.append(product_dict)
    
    conn.close()
    return render_template('index.html', products=products_with_cost)

# Страница редактирования продукции
@app.route('/edit/<int:product_id>', methods=['GET', 'POST'])
def edit_product(product_id):
    conn = get_db_connection()
    
    if request.method == 'POST':
        new_name = request.form['name']
        conn.execute('UPDATE Продукт SET Название = ? WHERE Код = ?', 
                    (new_name, product_id))
        conn.commit()
        conn.close()
        return redirect(url_for('index'))
    
    product = conn.execute('SELECT * FROM Продукт WHERE Код = ?', 
                         (product_id,)).fetchone()
    conn.close()
    return render_template('edit.html', product=product)

# Страница добавления продукции
@app.route('/add', methods=['GET', 'POST'])
def add_product():
    if request.method == 'POST':
        name = request.form['name']
        conn = get_db_connection()
        conn.execute('INSERT INTO Продукт (Название) VALUES (?)', (name,))
        conn.commit()
        conn.close()
        return redirect(url_for('index'))
    
    return render_template('add.html')

if __name__ == '__main__':
    app.run(debug=True)