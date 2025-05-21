from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Optional
import uvicorn

# Модели Pydantic
class Material(BaseModel):
    material_id: Optional[int] = None
    material_name: str
    material_type: str
    description: Optional[str] = None
    unit_price: float
    supplier: Optional[str] = None

class Product(BaseModel):
    product_id: Optional[int] = None
    product_name: str
    product_code: str
    width_cm: int
    length_cm: int
    thickness_mm: float
    price_per_roll: float
    production_time_days: Optional[int] = 3
    description: Optional[str] = None

class ProductMaterial(BaseModel):
    product_id: int
    material_id: int
    material_usage: str
    quantity_per_unit: float

# Настройка FastAPI
app = FastAPI(title="Учет продукции компании обоев")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение к базе данных
def get_db_connection():
    conn = psycopg2.connect(
        dbname="wallpaper_company",
        user="postgres",
        password="1234",
        host="localhost",
        port="5432",
        cursor_factory=RealDictCursor
    )
    return conn

# API для продукции
@app.get("/api/products", response_model=List[Product])
async def get_products():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT p.*, 
                   (SELECT COUNT(*) FROM product_materials pm WHERE pm.product_id = p.product_id) AS materials_count
            FROM products p
            ORDER BY p.product_id
        """)
        products = cur.fetchall()
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.post("/api/products", response_model=Product)
async def create_product(product: Product):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO products 
                (product_name, product_code, width_cm, length_cm, thickness_mm, 
                 price_per_roll, production_time_days, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """, (
            product.product_name, product.product_code, product.width_cm, 
            product.length_cm, product.thickness_mm, product.price_per_roll,
            product.production_time_days, product.description
        ))
        new_product = cur.fetchone()
        conn.commit()
        return new_product
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.put("/api/products/{product_id}", response_model=Product)
async def update_product(product_id: int, product: Product):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE products 
            SET product_name = %s, product_code = %s, width_cm = %s, length_cm = %s, 
                thickness_mm = %s, price_per_roll = %s, production_time_days = %s, description = %s
            WHERE product_id = %s
            RETURNING *
        """, (
            product.product_name, product.product_code, product.width_cm, 
            product.length_cm, product.thickness_mm, product.price_per_roll,
            product.production_time_days, product.description, product_id
        ))
        updated_product = cur.fetchone()
        if not updated_product:
            raise HTTPException(status_code=404, detail="Product not found")
        conn.commit()
        return updated_product
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM products WHERE product_id = %s RETURNING *", (product_id,))
        deleted_product = cur.fetchone()
        if not deleted_product:
            raise HTTPException(status_code=404, detail="Product not found")
        conn.commit()
        return {"message": "Product deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# API для материалов
@app.get("/api/materials", response_model=List[Material])
async def get_materials():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM materials ORDER BY material_id")
        materials = cur.fetchall()
        return materials
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.post("/api/materials", response_model=Material)
async def create_material(material: Material):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO materials 
                (material_name, material_type, description, unit_price, supplier)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
        """, (
            material.material_name, material.material_type, 
            material.description, material.unit_price, material.supplier
        ))
        new_material = cur.fetchone()
        conn.commit()
        return new_material
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.put("/api/materials/{material_id}", response_model=Material)
async def update_material(material_id: int, material: Material):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE materials 
            SET material_name = %s, material_type = %s, description = %s, 
                unit_price = %s, supplier = %s
            WHERE material_id = %s
            RETURNING *
        """, (
            material.material_name, material.material_type, 
            material.description, material.unit_price, 
            material.supplier, material_id
        ))
        updated_material = cur.fetchone()
        if not updated_material:
            raise HTTPException(status_code=404, detail="Material not found")
        conn.commit()
        return updated_material
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@app.delete("/api/materials/{material_id}")
async def delete_material(material_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM materials WHERE material_id = %s RETURNING *", (material_id,))
        deleted_material = cur.fetchone()
        if not deleted_material:
            raise HTTPException(status_code=404, detail="Material not found")
        conn.commit()
        return {"message": "Material deleted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# API для материалов продукта
@app.get("/api/products/{product_id}/materials", response_model=List[ProductMaterial])
async def get_product_materials(product_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT pm.*, m.material_name 
            FROM product_materials pm 
            JOIN materials m ON pm.material_id = m.material_id 
            WHERE pm.product_id = %s
        """, (product_id,))
        product_materials = cur.fetchall()
        return product_materials
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# Запуск сервера
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)