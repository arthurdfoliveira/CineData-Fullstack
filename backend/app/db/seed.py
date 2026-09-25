"""Carga inicial dos CSVs no banco.
 
Uso (dentro de backend/, com o venv ativo e depois do `alembic upgrade head`):
 
    python -m app.db.seed            # carrega os CSVs de backend/data/
    python -m app.db.seed --reset    # apaga os dados atuais e carrega de novo
"""
 
import argparse
import csv
import time
from collections.abc import Callable, Iterator
from datetime import date
from pathlib import Path
from typing import Any
 
from sqlalchemy import Table, create_engine, delete, event, func, select
from sqlalchemy.engine import Connection
 
from app.core.config import get_settings
from app.movies import models
 
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
BATCH_SIZE = 5_000
 
Row = dict[str, str]
 
 
def _text(value: str) -> str | None:
    return value.strip() or None
 
 
def _int(value: str) -> int | None:
    return int(float(value)) if value.strip() else None
 
 
def _float(value: str) -> float | None:
    return float(value) if value.strip() else None
 
 
def _date(value: str) -> date | None:
    return date.fromisoformat(value) if value.strip() else None
 
 
# Converte cada coluna do CSV para o tipo da tabela; colunas ausentes aqui ficam como texto.
CONVERTERS: dict[str, dict[str, Callable[[str], Any]]] = {
    "dim_movies": {
        "data_lancamento": _date,
        "ano_lancamento": _int,
        "duracao_minutos": _int,
    },
    "fact_movies_performance": {
        "orcamento_usd": _float,
        "receita_usd": _float,
        "lucro_usd": lambda v: _float(v) or 0.0,
        "orcamento_brl": _float,
        "receita_brl": _float,
        "lucro_brl": lambda v: _float(v) or 0.0,
        "popularidade": _float,
        "nota_tmdb": _float,
        "qtd_tmdb": _int,
        "nota_imdb": _float,
        "qtd_imdb": _int,
    },
    "dim_reviews": {"qtd_avaliacoes_usuarios": _int, "nota_media_usuarios": _float},
    "movie_reviews": {"nota": _float},
}
 
# Ordem importa: dimensões primeiro, depois fato e pontes (por causa das FKs).
LOAD_ORDER: list[tuple[str, Table]] = [
    ("dim_movies.csv", models.DimMovie.__table__),
    ("dim_genres.csv", models.DimGenre.__table__),
    ("dim_companies.csv", models.DimCompany.__table__),
    ("dim_people.csv", models.DimPerson.__table__),
    ("fact_movies_performance.csv", models.FactMoviePerformance.__table__),
    ("dim_reviews.csv", models.DimReview.__table__),
    ("movies_reviews.csv", models.MovieReview.__table__),
    ("bridge_movie_genre.csv", models.bridge_movie_genre),
    ("bridge_movie_company.csv", models.bridge_movie_company),
    ("bridge_movie_person.csv", models.bridge_movie_person),
]
 
 
def read_rows(path: Path, table: Table) -> Iterator[dict[str, Any]]:
    converters = CONVERTERS.get(table.name, {})
    columns = set(table.columns.keys())
 
    with path.open(encoding="utf-8-sig", newline="") as file:
        for row in csv.DictReader(file):
            yield {
                col: converters.get(col, _text)(value)
                for col, value in row.items()
                if col in columns
            }
 
 
def insert_in_batches(conn: Connection, table: Table, rows: Iterator[dict[str, Any]]) -> int:
    total = 0
    batch: list[dict[str, Any]] = []
 
    for row in rows:
        batch.append(row)
        if len(batch) == BATCH_SIZE:
            conn.execute(table.insert(), batch)
            total += len(batch)
            batch.clear()
 
    if batch:
        conn.execute(table.insert(), batch)
        total += len(batch)
 
    return total
 
 
def seed(data_dir: Path, reset: bool) -> None:
    missing = [name for name, _ in LOAD_ORDER if not (data_dir / name).exists()]
    if missing:
        raise SystemExit(f"CSVs não encontrados em {data_dir}: {', '.join(missing)}")
 
    # O Alembic e a carga usam o driver síncrono; a API continua assíncrona.
    url = get_settings().database_url.replace("+aiosqlite", "")
    engine = create_engine(url)
 
    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn: Any, _: Any) -> None:
        dbapi_conn.execute("PRAGMA foreign_keys=ON")
 
    with engine.begin() as conn:
        already_loaded = conn.execute(select(func.count()).select_from(models.DimMovie)).scalar()
 
        if already_loaded and not reset:
            raise SystemExit(
                f"O banco já tem {already_loaded} filmes. Use --reset para recarregar do zero."
            )
 
        if reset:
            for _, table in reversed(LOAD_ORDER):
                conn.execute(delete(table))
 
        for file_name, table in LOAD_ORDER:
            start = time.perf_counter()
            count = insert_in_batches(conn, table, read_rows(data_dir / file_name, table))
            print(f"{table.name:<26} {count:>8} linhas  ({time.perf_counter() - start:.1f}s)")
 
    engine.dispose()
    print("Carga concluída.")
 
 
def main() -> None:
    parser = argparse.ArgumentParser(description="Carrega os CSVs iniciais no banco.")
    parser.add_argument("--data-dir", type=Path, default=DATA_DIR)
    parser.add_argument("--reset", action="store_true", help="apaga os dados antes de carregar")
    args = parser.parse_args()
    seed(args.data_dir, args.reset)
 
 
if __name__ == "__main__":
    main()
 