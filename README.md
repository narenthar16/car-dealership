# Car Dealership Inventory System

Full-stack assessment starter built with React, Tailwind CSS, FastAPI, SQLAlchemy and a persistent SQLite database. It includes JWT authentication, role-protected admin inventory operations, search/filtering, purchasing, restocking and automated tests.

## Prerequisites
- macOS with Python 3.11+ and Node.js 20+ installed
- Git

## 1. Run the backend
Open Terminal:
```bash
cd car-dealership-assessment/backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
export SECRET_KEY="replace-this-with-a-long-random-secret"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="Choose-A-Strong-Unique-Password-123!"
uvicorn app.main:app --reload
```
Keep this terminal open. API docs: http://127.0.0.1:8000/docs

## 2. Run the frontend
Open a second Terminal window:
```bash
cd car-dealership-assessment/frontend
npm install
npm run dev
```
Open the local URL printed by Vite, normally http://localhost:5173. Sign in using the admin email/password set in the backend terminal. New registrations create ordinary users.

## 3. Run tests
Backend, in a terminal with backend virtual environment active:
```bash
cd car-dealership-assessment/backend
pytest -q
```
Frontend:
```bash
cd car-dealership-assessment/frontend
npm test
npm run build
```

## 4. TDD and Git workflow
The included tests are a starting test suite. For assessment-quality evidence, do not simply commit everything at once. Work feature by feature:
1. Write a test for the next behavior and run it; capture the failing result (Red).
2. Implement the smallest change that makes the test pass (Green).
3. Refactor and rerun all tests (Refactor).
4. Commit the tested change with a clear message.

Example commit sequence (make these commits as you actually do the work; do not fabricate history):
```bash
git init
git add README.md backend/requirements.txt backend/app/database.py backend/app/models.py backend/app/schemas.py backend/app/security.py
git commit -m "chore: scaffold FastAPI app and database models"
git add backend/tests/test_api.py
git commit -m "test: add initial API behavior tests"
git add backend/app/main.py
git commit -m "feat: implement authentication and inventory endpoints"
git add frontend/
git commit -m "feat: build responsive inventory dashboard"
git add README.md
 git commit -m "docs: document setup, tests, and AI usage"
```
If AI tools helped with a commit, follow the assessment's co-author-trailer instructions for that commit. The example author identity in the assignment is illustrative; use the actual tool's required identity if one is provided. Explain AI usage in the README and never claim you wrote generated code entirely unaided.

## 5. My AI Usage (complete honestly)
Use this as a template and edit it to reflect your actual workflow:
- **Tools used:** ChatGPT (and any other tool actually used, such as GitHub Copilot or Gemini).
- **How I used them:** To clarify the requirements, plan API routes and data models, generate an initial code scaffold, suggest test cases, explain errors, and review documentation.
- **What I did myself:** Ran the application and tests locally, inspected and modified the code, verified API behavior, and made final implementation decisions. Replace this sentence with the work you personally completed.
- **Impact and limitations:** AI accelerated scaffolding and helped me learn unfamiliar framework patterns. I treated suggestions as untrusted until checked, and I am responsible for validating security, correctness, and behavior.
- **Known limitations / next improvements:** Add database migrations, stronger concurrency handling for simultaneous purchases, rate limiting, audit logs, production secret management, and additional integration/UI tests.

## API endpoints
| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/vehicles` | Signed-in user |
| GET | `/api/vehicles/search` | Signed-in user |
| POST | `/api/vehicles` | Admin |
| PUT | `/api/vehicles/{id}` | Admin |
| DELETE | `/api/vehicles/{id}` | Admin |
| POST | `/api/vehicles/{id}/purchase` | Signed-in user |
| POST | `/api/vehicles/{id}/restock?amount=5` | Admin |

## Important notes
- SQLite is persistent; data is stored in `backend/dealership.db` and survives process restarts. Do not commit this database or secrets.
- The bootstrap admin is a local assessment convenience. Do not reuse the sample password in a real deployment.
- Prices are displayed in USD for the starter UI; change currency/locale if your assessment expects another currency.
- Run tests, inspect the code, understand the endpoints, and be prepared to explain the implementation. Do not submit code you have not verified or cannot discuss.
