import os
from typing import Annotated
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from .models import User, Vehicle
from .schemas import LoginIn, RegisterIn, TokenOut, VehicleIn, VehicleOut
from .security import create_access_token, hash_password, token_subject, verify_password

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Car Dealership Inventory API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
bearer = HTTPBearer(auto_error=False)
Db = Annotated[Session, Depends(get_db)]

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.post("/api/auth/register", response_model=TokenOut, status_code=201)
def register(payload: RegisterIn, db: Db):
    email = payload.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email is already registered")
    user = User(email=email, password_hash=hash_password(payload.password), is_admin=False)
    db.add(user); db.commit(); db.refresh(user)
    return TokenOut(access_token=create_access_token(str(user.id)), is_admin=user.is_admin)

@app.post("/api/auth/login", response_model=TokenOut)
def login(payload: LoginIn, db: Db):
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password", headers={"WWW-Authenticate": "Bearer"})
    return TokenOut(access_token=create_access_token(str(user.id)), is_admin=user.is_admin)

def current_user(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)], db: Db) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required", headers={"WWW-Authenticate": "Bearer"})
    subject = token_subject(credentials.credentials)
    if not subject:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.get(User, int(subject))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

CurrentUser = Annotated[User, Depends(current_user)]
def admin_user(user: CurrentUser) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Administrator access required")
    return user
AdminUser = Annotated[User, Depends(admin_user)]

@app.get("/api/vehicles", response_model=list[VehicleOut])
def list_vehicles(db: Db, user: CurrentUser):
    return list(db.scalars(select(Vehicle).order_by(Vehicle.id.desc())).all())

@app.get("/api/vehicles/search", response_model=list[VehicleOut])
def search_vehicles(db: Db, user: CurrentUser, make: str | None = None, model: str | None = None, category: str | None = None, min_price: float | None = Query(default=None, ge=0), max_price: float | None = Query(default=None, ge=0)):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status_code=422, detail="min_price must be less than or equal to max_price")
    query = select(Vehicle)
    if make: query = query.where(Vehicle.make.ilike(f"%{make}%"))
    if model: query = query.where(Vehicle.model.ilike(f"%{model}%"))
    if category: query = query.where(Vehicle.category.ilike(f"%{category}%"))
    if min_price is not None: query = query.where(Vehicle.price >= min_price)
    if max_price is not None: query = query.where(Vehicle.price <= max_price)
    return list(db.scalars(query.order_by(Vehicle.id.desc())).all())

@app.post("/api/vehicles", response_model=VehicleOut, status_code=201)
def add_vehicle(payload: VehicleIn, db: Db, user: AdminUser):
    vehicle = Vehicle(**payload.model_dump()); db.add(vehicle); db.commit(); db.refresh(vehicle); return vehicle

@app.put("/api/vehicles/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(vehicle_id: int, payload: VehicleIn, db: Db, user: AdminUser):
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle: raise HTTPException(status_code=404, detail="Vehicle not found")
    for key, value in payload.model_dump().items(): setattr(vehicle, key, value)
    db.commit(); db.refresh(vehicle); return vehicle

@app.delete("/api/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(vehicle_id: int, db: Db, user: AdminUser):
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle: raise HTTPException(status_code=404, detail="Vehicle not found")
    db.delete(vehicle); db.commit(); return None

@app.post("/api/vehicles/{vehicle_id}/purchase", response_model=VehicleOut)
def purchase_vehicle(vehicle_id: int, db: Db, user: CurrentUser):
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle: raise HTTPException(status_code=404, detail="Vehicle not found")
    if vehicle.quantity < 1: raise HTTPException(status_code=409, detail="Vehicle is out of stock")
    vehicle.quantity -= 1; db.commit(); db.refresh(vehicle); return vehicle

@app.post("/api/vehicles/{vehicle_id}/restock", response_model=VehicleOut)
def restock_vehicle(vehicle_id: int, amount: int = Query(ge=1, le=100000), db: Session = Depends(get_db), user: User = Depends(admin_user)):
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle: raise HTTPException(status_code=404, detail="Vehicle not found")
    vehicle.quantity += amount; db.commit(); db.refresh(vehicle); return vehicle

# Optional first-admin bootstrap. Set both variables before starting the API.
@app.on_event("startup")
def bootstrap_admin():
    email, password = os.getenv("ADMIN_EMAIL"), os.getenv("ADMIN_PASSWORD")
    if email and password:
        from .database import SessionLocal
        db = SessionLocal()
        try:
            user = db.scalar(select(User).where(User.email == email.lower()))
            if not user:
                db.add(User(email=email.lower(), password_hash=hash_password(password), is_admin=True)); db.commit()
            elif not user.is_admin:
                user.is_admin = True; db.commit()
        finally: db.close()
