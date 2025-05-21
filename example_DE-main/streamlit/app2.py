import streamlit as st
import sqlite3
import pandas as pd

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

# Функция для получения данных о продукции
def get_products():
    conn = get_db_connection()
    products = conn.execute('SELECT * FROM Продукт').fetchall()
    
    products_data = []
    for product in products:
        product_dict = dict(product)
        product_dict['Стоимость'] = calculate_product_cost(product['Код'])
        products_data.append(product_dict)
    
    conn.close()
    return products_data

# Функция для обновления продукта
def update_product(product_id, new_name):
    conn = get_db_connection()
    conn.execute('UPDATE Продукт SET Название = ? WHERE Код = ?', (new_name, product_id))
    conn.commit()
    conn.close()

# Функция для добавления продукта
def add_product(name):
    conn = get_db_connection()
    conn.execute('INSERT INTO Продукт (Название) VALUES (?)', (name,))
    conn.commit()
    conn.close()

# Основное приложение Streamlit
def main():
    st.sidebar.title("Навигация")
    page = st.sidebar.radio("Выберите страницу:", 
                           ["Просмотр продукции", "Редактирование продукции", "Добавление продукции"])

    if page == "Просмотр продукции":
        st.title("Список продукции с расчетом стоимости")
        
        products = get_products()
        if products:
            df = pd.DataFrame(products)
            st.dataframe(df[['Код', 'Название', 'Стоимость']])
        else:
            st.warning("Нет данных о продукции")

    elif page == "Редактирование продукции":
        st.title("Редактирование продукции")
        
        products = get_products()
        if products:
            product_options = {f"{p['Код']} - {p['Название']}": p['Код'] for p in products}
            selected_product = st.selectbox("Выберите продукт для редактирования:", 
                                          options=list(product_options.keys()))
            
            product_id = product_options[selected_product]
            current_name = next(p['Название'] for p in products if p['Код'] == product_id)
            
            new_name = st.text_input("Новое название продукта:", value=current_name)
            
            if st.button("Обновить продукт"):
                update_product(product_id, new_name)
                st.success("Продукт успешно обновлен!")
                st.rerun()
        else:
            st.warning("Нет продукции для редактирования")

    elif page == "Добавление продукции":
        st.title("Добавление новой продукции")
        
        new_product_name = st.text_input("Введите название нового продукта:")
        
        if st.button("Добавить продукт"):
            if new_product_name:
                add_product(new_product_name)
                st.success(f"Продукт '{new_product_name}' успешно добавлен!")
                st.rerun()
            else:
                st.error("Пожалуйста, введите название продукта")

if __name__ == "__main__":
    main()