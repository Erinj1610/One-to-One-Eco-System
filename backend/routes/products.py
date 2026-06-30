import os
import time
import shutil
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import Product, ProductFile, Supplier
from pydantic import BaseModel

router = APIRouter()

# Schema for creating/updating products
class ProductBase(BaseModel):
    name: str
    brand: Optional[str] = None
    sku: str
    cost_price: Optional[float] = 0.0
    trade_price: Optional[float] = 0.0
    retail_price: Optional[float] = 0.0
    stock_level: Optional[int] = 0
    supplier_id: Optional[int] = None
    
    family: Optional[str] = None
    category: Optional[str] = None
    reorder_level: Optional[int] = 100
    lead_time: Optional[str] = None
    origin: Optional[str] = None
    color: Optional[str] = None
    dimmable: Optional[str] = None
    dimming_protocol: Optional[str] = None
    driver_incl: Optional[str] = None
    light_source_incl: Optional[str] = None
    light_source_type: Optional[str] = None
    kelvin: Optional[str] = None
    beam_angle: Optional[str] = None
    cri: Optional[str] = None
    ip_rating: Optional[str] = None
    system_power: Optional[float] = 0.0
    lighting_type: Optional[str] = None
    cutout: Optional[str] = None
    driver_spec: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    pass

# Helper to serialize product with files and supplier
def serialize_product(product: Product):
    files_list = []
    for f in product.files:
        files_list.append({
            "id": f.id,
            "file_path": f.file_path,
            "file_name": f.file_name,
            "file_type": f.file_type,
            "uploaded_at": f.uploaded_at
        })
        
    supplier_info = None
    if product.supplier:
        supplier_info = {
            "id": product.supplier.id,
            "name": product.supplier.name,
            "contact_details": product.supplier.contact_details
        }
        
    return {
        "id": product.id,
        "name": product.name,
        "brand": product.brand,
        "sku": product.sku,
        "cost_price": product.cost_price,
        "trade_price": product.trade_price,
        "retail_price": product.retail_price,
        "stock_level": product.stock_level,
        "supplier_id": product.supplier_id,
        "family": product.family,
        "category": product.category,
        "reorder_level": product.reorder_level,
        "lead_time": product.lead_time,
        "origin": product.origin,
        "color": product.color,
        "dimmable": product.dimmable,
        "dimming_protocol": product.dimming_protocol,
        "driver_incl": product.driver_incl,
        "light_source_incl": product.light_source_incl,
        "light_source_type": product.light_source_type,
        "kelvin": product.kelvin,
        "beam_angle": product.beam_angle,
        "cri": product.cri,
        "ip_rating": product.ip_rating,
        "system_power": product.system_power,
        "lighting_type": product.lighting_type,
        "cutout": product.cutout,
        "driver_spec": product.driver_spec,
        "files": files_list,
        "supplier": supplier_info
    }

@router.get("/")
def list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    
    if q:
        query = query.filter(
            (Product.name.like(f"%{q}%")) | 
            (Product.sku.like(f"%{q}%")) | 
            (Product.brand.like(f"%{q}%"))
        )
        
    if category:
        query = query.filter(Product.category == category)
        
    if brand:
        query = query.filter(Product.brand == brand)
        
    # Standard query resolution
    products = query.all()
    
    serialized = [serialize_product(p) for p in products]
    
    # Optional filtering by status in python (status is derived or saved)
    if status:
        if status.lower() == "in stock":
            serialized = [p for p in serialized if p["stock_level"] > 0]
        elif status.lower() == "out of stock":
            serialized = [p for p in serialized if p["stock_level"] == 0]
        elif status.lower() == "low stock":
            serialized = [p for p in serialized if 0 < p["stock_level"] <= p["reorder_level"]]
            
    return serialized

@router.get("/{product_id}")
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return serialize_product(product)

@router.post("/")
def create_product(product_data: ProductCreate, db: Session = Depends(get_db)):
    # Check if SKU is unique
    existing = db.query(Product).filter(Product.sku == product_data.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product SKU '{product_data.sku}' already exists.")
        
    new_product = Product(**product_data.dict())
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return {"message": "Product created successfully", "id": new_product.id, "product": serialize_product(new_product)}

@router.put("/{product_id}")
def update_product(product_id: int, product_data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Check SKU uniqueness if changed
    if product.sku != product_data.sku:
        existing = db.query(Product).filter(Product.sku == product_data.sku).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Product SKU '{product_data.sku}' already exists.")

    for key, value in product_data.dict().items():
        setattr(product, key, value)
        
    db.commit()
    db.refresh(product)
    return {"message": "Product updated successfully", "product": serialize_product(product)}

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    db.delete(product)
    db.commit()
    return {"message": "Product deleted successfully"}

# File uploading support
@router.post("/{product_id}/upload")
def upload_product_file(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    # Ensure local upload dir exists
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save the file locally
    safe_filename = f"{int(time.time())}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(upload_dir, safe_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Create DB entry (serve files relatively using /uploads)
    db_file_path = f"/uploads/{safe_filename}"
    file_type = "image" if file.content_type.startswith("image/") else "pdf" if file.content_type == "application/pdf" else "other"
    
    new_file = ProductFile(
        product_id=product_id,
        file_path=db_file_path,
        file_name=file.filename,
        file_type=file_type,
        uploaded_at=time.strftime("%Y-%m-%d %H:%M:%S")
    )
    
    db.add(new_file)
    db.commit()
    db.refresh(new_file)
    
    return {
        "message": "File uploaded successfully",
        "file": {
            "id": new_file.id,
            "file_path": new_file.file_path,
            "file_name": new_file.file_name,
            "file_type": new_file.file_type
        }
    }

# Also support deleting a file
@router.delete("/{product_id}/files/{file_id}")
def delete_product_file(product_id: int, file_id: int, db: Session = Depends(get_db)):
    db_file = db.query(ProductFile).filter(
        ProductFile.id == file_id,
        ProductFile.product_id == product_id
    ).first()
    
    if not db_file:
        raise HTTPException(status_code=404, detail="File not found")
        
    # Delete local file if it exists
    local_path = db_file.file_path.lstrip("/")
    if os.path.exists(local_path):
        try:
            os.remove(local_path)
        except Exception as e:
            print(f"Warning: could not delete local file {local_path}: {e}")
            
    db.delete(db_file)
    db.commit()
    return {"message": "File deleted successfully"}

# Fetch list of suppliers
@router.get("/suppliers/list")
def list_suppliers(db: Session = Depends(get_db)):
    suppliers = db.query(Supplier).all()
    return [{"id": s.id, "name": s.name} for s in suppliers]

from fastapi.responses import StreamingResponse
import io
import csv

@router.get("/template/csv")
def download_csv_template():
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    headers = [
        "sku", "name", "brand", "cost_price", "trade_price", "retail_price",
        "stock_level", "family", "category", "reorder_level", "lead_time",
        "origin", "color", "dimmable", "dimming_protocol", "driver_incl",
        "light_source_incl", "light_source_type", "kelvin", "beam_angle",
        "cri", "ip_rating", "system_power", "lighting_type", "cutout", "driver_spec"
    ]
    writer.writerow(headers)
    
    # A sample row
    sample_row = [
        "28402 9240 FW", "Downlight - Entero RD-S 14W 2700K 30° IP20 White", "Delta Light",
        "2416.37", "3451.95", "3835.50", "100", "Entero RD-S", "Downlight", "100", "6-8 Weeks",
        "Import", "White", "Yes", "Driver Dependent", "No", "Yes", "LED", "2700K", "30°",
        "90", "IP20", "14.0", "Architectural", "Ø76mm", "- External or Remote Driver"
    ]
    writer.writerow(sample_row)
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=product_import_template.csv"}
    )

@router.post("/import/csv")
async def import_csv_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    contents = await file.read()
    decoded = contents.decode("utf-8")
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    added_count = 0
    updated_count = 0
    
    for row in csv_reader:
        sku = row.get("sku")
        if not sku or not row.get("name"):
            continue
            
        try:
            cost = float(row.get("cost_price", 0) or 0)
            trade = float(row.get("trade_price", 0) or 0)
            retail = float(row.get("retail_price", 0) or 0)
            stock = int(row.get("stock_level", 0) or 0)
            reorder = int(row.get("reorder_level", 100) or 100)
            power = float(row.get("system_power", 0) or 0)
        except ValueError:
            cost = 0.0
            trade = 0.0
            retail = 0.0
            stock = 0
            reorder = 100
            power = 0.0
            
        prod_data = {
            "name": row.get("name"),
            "brand": row.get("brand"),
            "sku": sku,
            "cost_price": cost,
            "trade_price": trade,
            "retail_price": retail,
            "stock_level": stock,
            "reorder_level": reorder,
            "family": row.get("family"),
            "category": row.get("category"),
            "lead_time": row.get("lead_time"),
            "origin": row.get("origin"),
            "color": row.get("color"),
            "dimmable": row.get("dimmable"),
            "dimming_protocol": row.get("dimming_protocol"),
            "driver_incl": row.get("driver_incl"),
            "light_source_incl": row.get("light_source_incl"),
            "light_source_type": row.get("light_source_type"),
            "kelvin": row.get("kelvin"),
            "beam_angle": row.get("beam_angle"),
            "cri": row.get("cri"),
            "ip_rating": row.get("ip_rating"),
            "system_power": power,
            "lighting_type": row.get("lighting_type"),
            "cutout": row.get("cutout"),
            "driver_spec": row.get("driver_spec")
        }
        
        existing = db.query(Product).filter(Product.sku == sku).first()
        if existing:
            for key, val in prod_data.items():
                setattr(existing, key, val)
            updated_count += 1
        else:
            new_p = Product(**prod_data)
            db.add(new_p)
            added_count += 1
            
    db.commit()
    return {"message": "CSV imported successfully", "added": added_count, "updated": updated_count}
