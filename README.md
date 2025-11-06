# An education platform

## Activation

### Frontend

```
cd frontend/frontend
npm install
npm run dev
```

### Backend

#### Mac/Linux:

```
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Windows (Powershell):

```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
