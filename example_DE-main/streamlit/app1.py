import streamlit as st
import sqlite3
import pandas as pd

# Функция для подключения к базе данных
def get_db_connection():
    conn = sqlite3.connect('db1')
    conn.row_factory = sqlite3.Row
    return conn

# Функция для расчета суммарного времени производства
def calculate_total_production_time(product_id):
    conn = get_db_connection()
    total_time = conn.execute(
        'SELECT SUM(Время) as total FROM ПродуктЦех WHERE ПродуктКод = ?',
        (product_id,)).fetchone()['total']
    conn.close()
    return total_time if total_time else 0

# Функция для получения данных о продукции
def get_products():
    conn = get_db_connection()
    products = conn.execute('SELECT * FROM products').fetchall()
    
    # Добавляем расчетное время производства
    products_with_time = []
    for product in products:
        product_dict = dict(product)
        product_dict['total_time'] = calculate_total_production_time(product['id'])
        products_with_time.append(product_dict)
    
    conn.close()
    return products_with_time

# Функция для обновления продукта
def update_product(product_id, new_title):
    conn = get_db_connection()
    conn.execute('UPDATE products SET title = ? WHERE id = ?', (new_title, product_id))
    conn.commit()
    conn.close()

# Функция для добавления продукта
def add_product(title):
    conn = get_db_connection()
    conn.execute('INSERT INTO products (title) VALUES (?)', (title,))
    conn.commit()
    conn.close()

# Основное приложение
def main():
    st.sidebar.title("Меню")
    page = st.sidebar.radio("Выберите страницу:", 
                           ["Просмотр продукции", "Редактирование продукции", "Добавление продукции"])

    if page == "Просмотр продукции":
        st.title("Производство мебели - Просмотр продукции")
        products = get_products()
        
        if not products:
            st.warning("Нет данных о продукции")
        else:
            # Преобразуем в DataFrame для красивого отображения
            df = pd.DataFrame(products)
            df = df.rename(columns={
                'id': 'ID',
                'title': 'Название продукции',
                'total_time': 'Общее время производства (мин)'
            })
            st.dataframe(df[['ID', 'Название продукции', 'Общее время производства (мин)']])

    elif page == "Редактирование продукции":
        st.title("Редактирование продукции")
        products = get_products()
        
        if not products:
            st.warning("Нет продукции для редактирования")
        else:
            product_options = {f"{p['id']} - {p['title']}": p['id'] for p in products}
            selected_product = st.selectbox(
                "Выберите продукт для редактирования:",
                options=list(product_options.keys())
            )
            
            product_id = product_options[selected_product]
            current_title = next(p['title'] for p in products if p['id'] == product_id)
            
            new_title = st.text_input("Новое название продукта:", value=current_title)
            
            if st.button("Сохранить изменения"):
                if new_title.strip() == "":
                    st.error("Название продукта не может быть пустым")
                else:
                    update_product(product_id, new_title)
                    st.success("Продукт успешно обновлен!")
                    st.rerun()

    elif page == "Добавление продукции":
        st.title("Добавление новой продукции")
        new_product = st.text_input("Введите название новой продукции:")
        
        if st.button("Добавить продукт"):
            if new_product.strip() == "":
                st.error("Название продукта не может быть пустым")
            else:
                add_product(new_product)
                st.success(f"Продукт '{new_product}' успешно добавлен!")
                st.rerun()

if __name__ == "__main__":
    main()