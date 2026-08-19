import os
import time
import shutil
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database.cloud_sql import get_db
from models.orm_models import Product, ProductFile, Supplier
from pydantic import BaseModel

from services.firebase_auth import verify_firebase_token
router = APIRouter(dependencies=[Depends(verify_firebase_token)])
public_router = APIRouter()

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
    
    # Custom fields from client old DB
    one_to_one_code: Optional[str] = None
    foh_code_description: Optional[str] = None
    client_description: Optional[str] = None
    fitting_type: Optional[str] = None
    consignment: Optional[str] = None
    selection: Optional[str] = None
    first_fix: Optional[str] = None
    red_list: Optional[str] = None
    markup: Optional[str] = None
    recommended_retail_price: Optional[float] = 0.0
    internal_cost: Optional[float] = 0.0
    supplier_name: Optional[str] = None
    local_or_import: Optional[str] = None
    driver_location: Optional[str] = None
    fittings_per_driver: Optional[str] = None
    driver_connection_type: Optional[str] = None
    driver_max_cable: Optional[str] = None
    qr: Optional[str] = None
    qr_link: Optional[str] = None
    client_code: Optional[str] = None
    image_url: Optional[str] = None
    technical_image_url: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    pass

# Helper to serialize product with files and supplier
def serialize_product(product: Product):
    from sqlalchemy import inspect as sa_inspect
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
        
    # Dynamically extract ALL table columns so future DB schema changes auto-serialize
    mapper = sa_inspect(product.__class__)
    out = {col.key: getattr(product, col.key) for col in mapper.column_attrs}
    out["files"] = files_list
    out["supplier"] = supplier_info
    return out

@router.get("/summary")
def products_summary(db: Session = Depends(get_db)):
    """Lightweight endpoint – returns just aggregate counts for the KPI cards."""
    from sqlalchemy import func
    total = db.query(func.count(Product.id)).scalar() or 0
    low_stock = db.query(func.count(Product.id)).filter(
        Product.stock_level > 0,
        Product.stock_level <= Product.reorder_level
    ).scalar() or 0
    out_of_stock = db.query(func.count(Product.id)).filter(
        Product.stock_level == 0
    ).scalar() or 0
    return {"total": total, "low_stock": low_stock, "out_of_stock": out_of_stock}

@router.get("/")
def list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    status: Optional[str] = None,
    limit: Optional[int] = 100,
    offset: Optional[int] = 0,
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    
    if q:
        query = query.filter(
            (Product.name.ilike(f"%{q}%")) | 
            (Product.sku.ilike(f"%{q}%")) | 
            (Product.brand.ilike(f"%{q}%")) |
            (Product.category.ilike(f"%{q}%"))
        )
        
    if category:
        query = query.filter(Product.category == category)
        
    if brand:
        query = query.filter(Product.brand == brand)

    if status:
        if status.lower() == "in stock":
            query = query.filter(Product.stock_level > 0)
        elif status.lower() == "out of stock":
            query = query.filter(Product.stock_level == 0)
        elif status.lower() == "low stock":
            query = query.filter(
                Product.stock_level > 0,
                Product.stock_level <= Product.reorder_level
            )

    total_count = query.count()
    products = query.order_by(Product.name).offset(offset).limit(limit).all()
    serialized = [serialize_product(p) for p in products]
            
    return {"items": serialized, "total": total_count, "limit": limit, "offset": offset}


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

    sku = product.sku
    # PERMANENT ERP GUARD: Product deletion is completely disabled to protect order/quote history.
    # Automatically convert status to 'Inactive' instead.
    setattr(product, 'is_active', False)
    setattr(product, 'status', 'Inactive')
    db.commit()
    return {
        "message": f"Product deletion is disabled. SKU '{sku}' has been marked as 'Inactive' so it cannot be used on new orders, while preserving all historical records.",
        "archived": True
    }

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

# Dedicated image upload endpoint — stores URL directly on the product row
@router.post("/{product_id}/upload-image")
def upload_product_image(
    product_id: int,
    file_category: str = Form(...),  # 'product_image' or 'technical_image'
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if file_category not in ("product_image", "technical_image"):
        raise HTTPException(status_code=400, detail="file_category must be 'product_image' or 'technical_image'")

    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    safe_filename = f"{int(time.time())}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(upload_dir, safe_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_file_path = f"/uploads/{safe_filename}"

    if file_category == "product_image":
        product.image_url = db_file_path
    else:
        product.technical_image_url = db_file_path

    db.commit()
    db.refresh(product)

    return {
        "message": f"{file_category} uploaded successfully",
        "file_path": db_file_path,
        "product": serialize_product(product)
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

@public_router.get("/template/csv")
def download_csv_template():
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    headers = [
        "sku", "name", "brand", "cost_price", "trade_price", "retail_price",
        "stock_level", "family", "category", "reorder_level", "lead_time",
        "origin", "color", "dimmable", "dimming_protocol", "driver_incl",
        "light_source_incl", "light_source_type", "kelvin", "beam_angle",
        "cri", "ip_rating", "system_power", "lighting_type", "cutout", "driver_spec",
        "one_to_one_code", "foh_code_description", "client_description", "fitting_type",
        "consignment", "selection", "first_fix", "red_list", "markup",
        "recommended_retail_price", "qr", "qr_link", "client_code",
        "image_url", "technical_image_url"
    ]
    writer.writerow(headers)
    
    # A sample row
    sample_row = [
        "28402 9240 FW", "Downlight - Entero RD-S 14W 2700K 30° IP20 White", "Delta Light",
        "2416.37", "3451.95", "3835.50", "100", "Entero RD-S", "Downlight", "100", "6-8 Weeks",
        "Import", "White", "Yes", "Driver Dependent", "No", "Yes", "LED", "2700K", "30°",
        "90", "IP20", "14.0", "Architectural", "Ø76mm", "- External or Remote Driver",
        "1:1-ENT-RDS", "Front of House Entero S Description", "Entero RD-S Downlight White", "Recessed Downlight",
        "No", "Primary Selection", "First Fix", "No", "37%",
        "3835.50", "QR-CODE", "https://example.com/qr", "CLIENT-1002", "", ""
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
        sku = str(row.get("sku", "") or "").strip()
        name = str(row.get("name", "") or "").strip()
        if not sku or not name:
            continue
            
        try:
            cost = float(row.get("cost_price", 0) or 0)
            trade = float(row.get("trade_price", 0) or 0)
            retail = float(row.get("retail_price", 0) or 0)
            stock = int(row.get("stock_level", 0) or 0)
            reorder = int(row.get("reorder_level", 100) or 100)
            power = float(row.get("system_power", 0) or 0)
            rrp = float(row.get("recommended_retail_price", 0) or 0)
        except ValueError:
            cost = 0.0
            trade = 0.0
            retail = 0.0
            stock = 0
            reorder = 100
            power = 0.0
            rrp = 0.0
            
        prod_data = {
            "name": name,
            "brand": str(row.get("brand") or ""),
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
            "driver_spec": row.get("driver_spec"),
            "one_to_one_code": row.get("one_to_one_code"),
            "foh_code_description": row.get("foh_code_description"),
            "client_description": row.get("client_description"),
            "fitting_type": row.get("fitting_type"),
            "consignment": row.get("consignment"),
            "selection": row.get("selection"),
            "first_fix": row.get("first_fix"),
            "red_list": row.get("red_list"),
            "markup": row.get("markup"),
            "recommended_retail_price": rrp,
            "qr": row.get("qr"),
            "qr_link": row.get("qr_link"),
            "client_code": row.get("client_code"),
            "image_url": row.get("image_url") or None,
            "technical_image_url": row.get("technical_image_url") or None
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

class ReconcileProductsSchema(BaseModel):
    products: List[dict]

@router.post("/reconcile-products-bulk")
def reconcile_products_bulk(payload: ReconcileProductsSchema, db: Session = Depends(get_db)):
    added_count = 0
    updated_count = 0

    # Get valid column names so we never try to set a column that doesn't exist yet
    from sqlalchemy import inspect as sa_inspect
    valid_cols = {c.key for c in sa_inspect(Product).mapper.column_attrs}

    try:
        seen_skus = set()  # Track SKUs processed in this batch to avoid duplicates
        for row in payload.products:
            sku = str(row.get("sku", "") or "").strip()
            name = str(row.get("name", "") or "").strip()
            if not sku or not name or sku in seen_skus:
                continue
            seen_skus.add(sku)

            try:
                cost = float(row.get("cost_price", 0) or 0)
                trade = float(row.get("trade_price", 0) or 0)
                retail = float(row.get("retail_price", 0) or 0)
                stock = int(row.get("stock_level", 0) or 0)
                reorder = int(row.get("reorder_level", 100) or 100)
                power = float(row.get("system_power", 0) or 0)
                rrp = float(row.get("recommended_retail_price", 0) or 0)
                internal_cost = float(row.get("internal_cost", 0) or 0)
            except (ValueError, TypeError):
                cost = 0.0; trade = 0.0; retail = 0.0
                stock = 0; reorder = 100; power = 0.0; rrp = 0.0; internal_cost = 0.0

            prod_data = {
                "name": name,
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
                "driver_spec": row.get("driver_spec"),
                "one_to_one_code": row.get("one_to_one_code"),
                "foh_code_description": row.get("foh_code_description"),
                "client_description": row.get("client_description"),
                "fitting_type": row.get("fitting_type"),
                "consignment": row.get("consignment"),
                "selection": row.get("selection"),
                "first_fix": row.get("first_fix"),
                "red_list": row.get("red_list"),
                "markup": row.get("markup"),
                "recommended_retail_price": rrp,
                "internal_cost": internal_cost,
                "supplier_name": row.get("supplier_name") or row.get("supplier"),
                "local_or_import": row.get("local_or_import") or row.get("origin"),
                "driver_location": row.get("driver_location"),
                "fittings_per_driver": row.get("fittings_per_driver"),
                "driver_connection_type": row.get("driver_connection_type"),
                "driver_max_cable": row.get("driver_max_cable"),
                "qr": row.get("qr"),
                "qr_link": row.get("qr_link"),
                "client_code": row.get("client_code"),
                "image_url": row.get("image_url") or None,
                "technical_image_url": row.get("technical_image_url") or None,
            }

            # Only keep keys that actually exist as DB columns
            prod_data = {k: v for k, v in prod_data.items() if k in valid_cols}

            existing = db.query(Product).filter(Product.sku == sku).first()
            if existing:
                for key, val in prod_data.items():
                    setattr(existing, key, val)
                updated_count += 1
            else:
                new_p = Product(**prod_data)
                db.add(new_p)
                db.flush()  # Flush so subsequent queries in same transaction see this row
                added_count += 1

        db.commit()
        return {"message": "Reconciliation successful", "added": added_count, "updated": updated_count}

    except Exception as e:
        db.rollback()
        print(f"Reconcile error: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

# Enterprise Batch Update Payload Schemas
class BatchItemUpdate(BaseModel):
    id: int
    sku: Optional[str] = None
    changes: dict

class BatchUpdatePayload(BaseModel):
    updated_by_user_id: Optional[int] = None
    updated_by_name: Optional[str] = "Product Manager"
    updates: List[BatchItemUpdate]

@router.post("/batch-update")
def batch_update_products(
    payload: BatchUpdatePayload,
    db: Session = Depends(get_db)
):
    """
    Enterprise Batch Update Endpoint:
    - Atomically updates multiple products inside a single SQL Transaction.
    - Validates values (non-negative prices/stock, SKU uniqueness).
    - If ANY validation fails, ROLLBACKS the entire batch.
    - Records field-level changes to `product_audit_logs` table (ON DELETE RESTRICT).
    """
    from models.orm_models import ProductAuditLog
    from sqlalchemy import inspect as sa_inspect
    
    if not payload.updates:
        return {"message": "No updates provided", "updated_count": 0, "logs_count": 0}

    valid_cols = set(c.key for c in sa_inspect(Product).column_attrs)
    
    audit_logs = []
    updated_products = 0

    try:
        # Begin explicit SQL Transaction (FastAPI get_db handles session transaction)
        for item in payload.updates:
            prod = db.query(Product).filter(Product.id == item.id).first()
            if not prod:
                db.rollback()
                raise HTTPException(
                    status_code=400, 
                    detail=f"Batch Rollback: Product ID {item.id} not found in database."
                )

            changes = item.changes or {}
            
            # Validation Step
            for field, new_val in changes.items():
                if field not in valid_cols:
                    continue

                # 1. Price non-negative check
                if field in ("cost_price", "trade_price", "retail_price", "recommended_retail_price", "internal_cost"):
                    try:
                        val_num = float(new_val) if new_val is not None else 0.0
                        if val_num < 0:
                            db.rollback()
                            raise HTTPException(
                                status_code=400, 
                                detail=f"Batch Rollback Validation Error: Field '{field}' on SKU '{prod.sku}' cannot be negative (got {new_val})."
                            )
                    except (ValueError, TypeError):
                        db.rollback()
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Batch Rollback Validation Error: Invalid numeric price '{new_val}' for '{field}' on SKU '{prod.sku}'."
                        )

                # 2. Stock non-negative check
                if field in ("stock_level", "reorder_level"):
                    try:
                        val_int = int(new_val) if new_val is not None else 0
                        if val_int < 0:
                            db.rollback()
                            raise HTTPException(
                                status_code=400, 
                                detail=f"Batch Rollback Validation Error: '{field}' on SKU '{prod.sku}' cannot be negative."
                            )
                    except (ValueError, TypeError):
                        db.rollback()
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Batch Rollback Validation Error: Invalid integer value for '{field}' on SKU '{prod.sku}'."
                        )

                # 3. SKU Uniqueness check if SKU modified
                if field == "sku" and new_val != prod.sku:
                    existing_sku = db.query(Product).filter(Product.sku == new_val, Product.id != prod.id).first()
                    if existing_sku:
                        db.rollback()
                        raise HTTPException(
                            status_code=400, 
                            detail=f"Batch Rollback Validation Error: SKU '{new_val}' already exists on another product."
                        )

                # Track Audit Log entry if value actually changed
                old_val = getattr(prod, field, None)
                old_val_str = str(old_val) if old_val is not None else ""
                new_val_str = str(new_val) if new_val is not None else ""

                if old_val_str != new_val_str:
                    setattr(prod, field, new_val)
                    audit_entry = ProductAuditLog(
                        product_id=int(prod.id),
                        sku=str(prod.sku),
                        field_changed=str(field),
                        old_value=old_val_str,
                        new_value=new_val_str,
                        updated_by_user_id=payload.updated_by_user_id,
                        updated_by_name=payload.updated_by_name
                    )
                    audit_logs.append(audit_entry)

            updated_products += 1

        # Add all audit log records to DB session
        for log in audit_logs:
            db.add(log)

        # Commit entire transaction atomically
        db.commit()
        return {
            "message": f"Successfully updated {updated_products} product(s) in a single atomic transaction.",
            "updated_count": updated_products,
            "audit_logs_written": len(audit_logs)
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as err:
        db.rollback()
        print(f"Batch update error: {err}")
        raise HTTPException(status_code=500, detail=f"Batch Transaction Failed & Rolled Back: {str(err)}")
