from fastapi import FastAPI
from app.database.database import Base, engine
from app.auth import routes as auth_routes

app = FastAPI(title="Edu Senior Backend")

Base.metadata.create_all(bind=engine)

app.include_router(auth_routes.router, prefix="/auth", tags=["Authentication"])
