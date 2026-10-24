# Car Dealership Inventory API

## Requirements
Python 3.11+ recommended.

## Run locally (macOS)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
export SECRET_KEY="replace-with-a-long-random-secret"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="Use-A-Strong-Unique-Password-123!"
uvicorn app.main:app --reload
```
API docs: http://127.0.0.1:8000/docs
The SQLite file `dealership.db` is created automatically and persists between restarts.

## Tests
Run from `backend/` with the virtual environment active:
```bash
pytest -q
```

## API summary
- `POST /api/auth/register` — register a non-admin user
- `POST /api/auth/login` — receive a JWT
- `GET /api/vehicles` — list inventory (JWT required)
- `GET /api/vehicles/search?make=Toyota&min_price=10000&max_price=30000` — filter inventory
- `POST /api/vehicles` — create (admin only)
- `PUT /api/vehicles/{id}` — update (admin only)
- `DELETE /api/vehicles/{id}` — delete (admin only)
- `POST /api/vehicles/{id}/purchase` — decrement stock for a signed-in user
- `POST /api/vehicles/{id}/restock?amount=5` — restock (admin only)

## Security notes
Set a strong, private `SECRET_KEY` and admin password. Do not commit secrets or the database file. The sample bootstrap admin is for local assessment setup; production deployments need managed secrets, HTTPS, rate limiting, migrations and audit logging.
