"""Rotas HTTP do domínio de filmes."""
 
from enum import StrEnum
from typing import Annotated
 
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload
 
from app.db.session import get_db
from app.movies.models import (
    DimGenre,
    DimMovie,
    DimReview,
    FactMoviePerformance,
    MovieReview,
    bridge_movie_genre,
)
from app.movies.schemas import (
    MovieDetail,
    MovieListItem,
    MovieReviewOut,
    Page,
)
 
router = APIRouter()
 
 
class OrderBy(StrEnum):
    popularidade = "popularidade"
    nota_tmdb = "nota_tmdb"
    ano_lancamento = "ano_lancamento"
    titulo = "titulo"
 
 
class OrderDir(StrEnum):
    asc = "asc"
    desc = "desc"
 
 
PageParam = Annotated[int, Query(ge=1)]
PageSizeParam = Annotated[int, Query(ge=1, le=100)]
 
 
async def _get_movie_or_404(db: AsyncSession, id_filme: str) -> DimMovie:
    movie = await db.scalar(select(DimMovie).where(DimMovie.id_filme == id_filme))
    if movie is None:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    return movie
 
 
@router.get("", response_model=Page[MovieListItem])
async def list_movies(
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = Query(default=None, description="Busca por parte do título"),
    genero: str | None = Query(default=None, description="Nome exato do gênero"),
    ano: int | None = Query(default=None, description="Ano de lançamento"),
    order_by: OrderBy = OrderBy.popularidade,
    order: OrderDir = OrderDir.desc,
    page: PageParam = 1,
    page_size: PageSizeParam = 20,
) -> Page[MovieListItem]:
    filters = []
    if search:
        filters.append(DimMovie.titulo.ilike(f"%{search}%"))
    if ano is not None:
        filters.append(DimMovie.ano_lancamento == ano)
 
    base = select(DimMovie.sk_movie_id)
    if genero:
        base = base.join(bridge_movie_genre).join(DimGenre).where(DimGenre.nome_genero == genero)
    base = base.where(*filters)
 
    total = await db.scalar(select(func.count()).select_from(base.subquery()))
    total = total or 0
    total_pages = max(1, -(-total // page_size))
 
    order_column = {
        OrderBy.popularidade: FactMoviePerformance.popularidade,
        OrderBy.nota_tmdb: FactMoviePerformance.nota_tmdb,
        OrderBy.ano_lancamento: DimMovie.ano_lancamento,
        OrderBy.titulo: DimMovie.titulo,
    }[order_by]
    order_clause = order_column.asc() if order is OrderDir.asc else order_column.desc()
 
    query = (
        select(DimMovie)
        .outerjoin(FactMoviePerformance)
        .options(joinedload(DimMovie.performance), joinedload(DimMovie.reviews_summary))
        .order_by(order_clause.nulls_last(), DimMovie.sk_movie_id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    if genero:
        query = query.join(bridge_movie_genre).join(DimGenre).where(DimGenre.nome_genero == genero)
    query = query.where(*filters)
 
    movies = (await db.scalars(query)).unique().all()
 
    items = [
        MovieListItem(
            id_filme=m.id_filme,
            titulo=m.titulo,
            ano_lancamento=m.ano_lancamento,
            duracao_minutos=m.duracao_minutos,
            status_filme=m.status_filme,
            url_poster=m.url_poster,
            nota_tmdb=m.performance.nota_tmdb if m.performance else None,
            popularidade=m.performance.popularidade if m.performance else None,
            nota_media_usuarios=(
                m.reviews_summary.nota_media_usuarios if m.reviews_summary else None
            ),
            qtd_avaliacoes_usuarios=(
                m.reviews_summary.qtd_avaliacoes_usuarios if m.reviews_summary else None
            ),
        )
        for m in movies
    ]
    return Page(items=items, page=page, page_size=page_size, total=total, total_pages=total_pages)
 
 
@router.get("/{id_filme}", response_model=MovieDetail)
async def get_movie(id_filme: str, db: Annotated[AsyncSession, Depends(get_db)]) -> MovieDetail:
    query = (
        select(DimMovie)
        .where(DimMovie.id_filme == id_filme)
        .options(
            selectinload(DimMovie.genres),
            selectinload(DimMovie.companies),
            selectinload(DimMovie.people),
            joinedload(DimMovie.performance),
            joinedload(DimMovie.reviews_summary),
        )
    )
    movie = await db.scalar(query)
    if movie is None:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
 
    return MovieDetail(
        id_filme=movie.id_filme,
        titulo=movie.titulo,
        data_lancamento=movie.data_lancamento,
        ano_lancamento=movie.ano_lancamento,
        duracao_minutos=movie.duracao_minutos,
        status_filme=movie.status_filme,
        sinopse=movie.sinopse,
        url_poster=movie.url_poster,
        url_backdrop=movie.url_backdrop,
        generos=[g.nome_genero for g in movie.genres],
        produtoras=[c.nome_produtora for c in movie.companies],
        elenco=movie.people,
        performance=movie.performance,
        nota_media_usuarios=movie.reviews_summary.nota_media_usuarios
        if movie.reviews_summary
        else None,
        qtd_avaliacoes_usuarios=movie.reviews_summary.qtd_avaliacoes_usuarios
        if movie.reviews_summary
        else None,
    )
 
 
@router.get("/{id_filme}/reviews", response_model=Page[MovieReviewOut])
async def list_movie_reviews(
    id_filme: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: PageParam = 1,
    page_size: PageSizeParam = 20,
) -> Page[MovieReviewOut]:
    movie = await _get_movie_or_404(db, id_filme)
 
    total = await db.scalar(
        select(func.count())
        .select_from(MovieReview)
        .where(MovieReview.sk_movie_id == movie.sk_movie_id)
    )
    total = total or 0
    total_pages = max(1, -(-total // page_size))
 
    reviews = (
        await db.scalars(
            select(MovieReview)
            .where(MovieReview.sk_movie_id == movie.sk_movie_id)
            .order_by(MovieReview.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
 
    items = [MovieReviewOut.model_validate(r) for r in reviews]
    return Page(items=items, page=page, page_size=page_size, total=total, total_pages=total_pages)
 
 
__all__ = ["router"]
# DimReview importado só para registrar o relationship reviews_summary no metadata.
_ = DimReview
 