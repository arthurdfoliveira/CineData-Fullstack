"""Rotas HTTP do domínio de filmes."""

from enum import StrEnum
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.db.session import get_db
from app.movies.models import (
    DimGenre,
    DimMovie,
    DimPerson,
    DimReview,
    FactMoviePerformance,
    MovieReview,
    bridge_movie_genre,
)
from app.movies.schemas import (
    MovieDetail,
    MovieInput,
    MovieListItem,
    MovieReviewCreate,
    MovieReviewOut,
    Page,
)

router = APIRouter()
genres_router = APIRouter()


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


async def _load_movie(db: AsyncSession, id_filme: str) -> DimMovie:
    """Carrega o filme com tudo que a página de detalhe mostra (ou devolve 404)."""

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
        # Garante dados atualizados depois de um cadastro/edição na mesma sessão.
        .execution_options(populate_existing=True)
    )
    movie = await db.scalar(query)
    if movie is None:
        raise HTTPException(status_code=404, detail="Filme não encontrado")
    return movie


def _to_detail(movie: DimMovie) -> MovieDetail:
    summary = movie.reviews_summary
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
        nota_media_usuarios=summary.nota_media_usuarios if summary else None,
        qtd_avaliacoes_usuarios=summary.qtd_avaliacoes_usuarios if summary else None,
    )


async def _apply_input(db: AsyncSession, movie: DimMovie, payload: MovieInput) -> None:
    """Copia os dados do formulário para o filme, incluindo gêneros e diretor."""

    movie.titulo = payload.titulo
    movie.ano_lancamento = payload.ano_lancamento
    movie.sinopse = payload.sinopse
    movie.duracao_minutos = payload.duracao_minutos
    movie.url_poster = payload.url_poster
    # A data completa não vem do formulário; se o ano mudou, ela deixa de valer.
    if movie.data_lancamento and movie.data_lancamento.year != payload.ano_lancamento:
        movie.data_lancamento = None

    genres = list(
        await db.scalars(select(DimGenre).where(DimGenre.nome_genero.in_(payload.generos)))
    )
    unknown = set(payload.generos) - {g.nome_genero for g in genres}
    if unknown:
        raise HTTPException(
            status_code=422, detail=f"Gênero(s) inexistente(s): {', '.join(sorted(unknown))}"
        )
    movie.genres = sorted(genres, key=lambda g: g.nome_genero)

    # Troca só a direção; elenco e roteiristas continuam como estavam.
    # Vários diretores chegam separados por vírgula (nenhum nome da base tem vírgula).
    others = [p for p in movie.people if p.tipo_pessoa != "Diretor"]
    names = list(dict.fromkeys(n.strip() for n in (payload.diretor or "").split(",") if n.strip()))
    for name in names:
        director = await db.scalar(
            select(DimPerson).where(
                DimPerson.nome_pessoa == name, DimPerson.tipo_pessoa == "Diretor"
            )
        )
        if director is None:
            director = DimPerson(nome_pessoa=name, tipo_pessoa="Diretor")
            db.add(director)
        others.append(director)
    movie.people = others


@router.post("", response_model=MovieDetail, status_code=201)
async def create_movie(
    payload: MovieInput, db: Annotated[AsyncSession, Depends(get_db)]
) -> MovieDetail:
    # Filmes cadastrados pelo app ganham um id próprio, diferente dos ids do TMDB.
    movie = DimMovie(id_filme=f"cd-{uuid4().hex[:10]}", titulo=payload.titulo, genres=[], people=[])
    db.add(movie)
    await _apply_input(db, movie, payload)
    await db.commit()

    return _to_detail(await _load_movie(db, movie.id_filme))


@router.get("/{id_filme}", response_model=MovieDetail)
async def get_movie(id_filme: str, db: Annotated[AsyncSession, Depends(get_db)]) -> MovieDetail:
    return _to_detail(await _load_movie(db, id_filme))


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
            .order_by(MovieReview.created_at.desc(), MovieReview.sk_movie_review_id)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    items = [MovieReviewOut.model_validate(r) for r in reviews]
    return Page(items=items, page=page, page_size=page_size, total=total, total_pages=total_pages)


async def _refresh_reviews_summary(db: AsyncSession, sk_movie_id: str) -> None:
    """Recalcula quantidade e média de avaliações do filme a partir de movie_reviews."""

    qtd, media = (
        await db.execute(
            select(func.count(), func.avg(MovieReview.nota)).where(
                MovieReview.sk_movie_id == sk_movie_id
            )
        )
    ).one()

    summary = await db.scalar(select(DimReview).where(DimReview.sk_movie_id == sk_movie_id))
    if summary is None:
        summary = DimReview(sk_movie_id=sk_movie_id)
        db.add(summary)

    summary.qtd_avaliacoes_usuarios = qtd
    summary.nota_media_usuarios = round(media, 2) if media is not None else None


@router.post("/{id_filme}/reviews", response_model=MovieReviewOut, status_code=201)
async def create_movie_review(
    id_filme: str,
    payload: MovieReviewCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MovieReviewOut:
    movie = await _get_movie_or_404(db, id_filme)

    review = MovieReview(sk_movie_id=movie.sk_movie_id, **payload.model_dump())
    db.add(review)
    await db.flush()
    await _refresh_reviews_summary(db, movie.sk_movie_id)
    await db.commit()
    await db.refresh(review)

    return MovieReviewOut.model_validate(review)


@genres_router.get("", response_model=list[str])
async def list_genres(db: Annotated[AsyncSession, Depends(get_db)]) -> list[str]:
    """Lista os nomes dos gêneros em ordem alfabética (usado no filtro do catálogo)."""

    return list(await db.scalars(select(DimGenre.nome_genero).order_by(DimGenre.nome_genero)))
