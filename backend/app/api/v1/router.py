from fastapi import APIRouter
 
from app.movies.router import router as movies_router
 
api_router = APIRouter()
 
api_router.include_router(movies_router, prefix="/movies", tags=["movies"])

# Registre aqui os routers dos futuros domínios. Exemplo:
# api_router.include_router(movies_router, prefix="/movies", tags=["movies"])
