import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app
from app.models import User
from app.security import hash_password

@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)
    def override_db():
        db = TestingSession()
        try: yield db
        finally: db.close()
    app.dependency_overrides[get_db] = override_db
    with TestingSession() as db:
        db.add(User(email="admin@example.com", password_hash=hash_password("AdminPass123!"), is_admin=True))
        db.commit()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)

def register_and_login(client, email="user@example.com", password="StrongPass123!"):
    client.post("/api/auth/register", json={"email": email, "password": password})
    result = client.post("/api/auth/login", json={"email": email, "password": password})
    assert result.status_code == 200
    return {"Authorization": f"Bearer {result.json()['access_token']}"}

def admin_headers(client):
    response = client.post("/api/auth/login", json={"email":"admin@example.com", "password":"AdminPass123!"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}

def test_health_check(client):
    assert client.get("/api/health").json() == {"status": "ok"}

def test_register_and_login(client):
    headers = register_and_login(client)
    assert headers["Authorization"].startswith("Bearer ")

def test_duplicate_registration_rejected(client):
    payload = {"email":"duplicate@example.com", "password":"StrongPass123!"}
    assert client.post("/api/auth/register", json=payload).status_code == 201
    assert client.post("/api/auth/register", json=payload).status_code == 409

def test_vehicle_creation_requires_admin(client):
    headers = register_and_login(client)
    payload = {"make":"Toyota", "model":"Corolla", "category":"Sedan", "price":18000, "quantity":3}
    assert client.post("/api/vehicles", json=payload, headers=headers).status_code == 403

def test_admin_can_add_and_user_can_purchase_until_zero(client):
    admin = admin_headers(client)
    payload = {"make":"Toyota", "model":"Corolla", "category":"Sedan", "price":18000, "quantity":1}
    created = client.post("/api/vehicles", json=payload, headers=admin)
    assert created.status_code == 201
    vehicle_id = created.json()["id"]
    user = register_and_login(client)
    assert client.post(f"/api/vehicles/{vehicle_id}/purchase", headers=user).json()["quantity"] == 0
    assert client.post(f"/api/vehicles/{vehicle_id}/purchase", headers=user).status_code == 409

def test_search_by_make_and_price(client):
    admin = admin_headers(client)
    for make, price in [("Toyota", 18000), ("Honda", 22000)]:
        client.post("/api/vehicles", headers=admin, json={"make":make,"model":"Test","category":"Sedan","price":price,"quantity":2})
    user = register_and_login(client)
    result = client.get("/api/vehicles/search?make=toyota&max_price=20000", headers=user)
    assert result.status_code == 200
    assert len(result.json()) == 1 and result.json()[0]["make"] == "Toyota"
