from collections.abc import AsyncIterator
from pathlib import Path
 
import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
 
from app.db.base import Base
from app.db.session import enable_sqlite_foreign_keys, get_db
from app.main import app
from app.movies.models import DimMovie
 
 
@pytest.fixture
async def client(tmp_path: Path) -> AsyncIterator[httpx.AsyncClient]:
    """Cliente HTTP apontando para um banco temporário com um filme de exemplo."""
 
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")
    enable_sqlite_foreign_keys(engine)
    session_factory = async_sessionmaker(bind=engine, expire_on_commit=False)
 
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
 
    async with session_factory() as session:
        session.add(DimMovie(id_filme="1", titulo="Filme Teste", ano_lancamento=2020))
        await session.commit()
 
    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session
 
    app.dependency_overrides[get_db] = override_get_db
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http_client:
        yield http_client
 
    app.dependency_overrides.clear()
    await engine.dispose()
 