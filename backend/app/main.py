from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import routes as auth_routes
from app.database.database import Base, engine

app = FastAPI(title="Edu Senior Backend")
origins = [
    "http://localhost:5173",  # Vite
    "http://localhost:3000",  # CRA
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # <--- REQUIRED so OPTIONS is allowed
    allow_headers=["*"],  # <--- REQUIRED so browser can send headers
)
Base.metadata.create_all(bind=engine)

app.include_router(auth_routes.router, prefix="/auth", tags=["Authentication"])
