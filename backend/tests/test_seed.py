from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.seed import refresh_review_summaries
from app.movies.models import DimMovie, DimReview, MovieReview


def test_refresh_review_summaries_uses_real_reviews() -> None:
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        com_resumo_errado = DimMovie(id_filme="1", titulo="Resumo errado")
        sem_resumo = DimMovie(id_filme="2", titulo="Sem resumo")
        sem_reviews = DimMovie(id_filme="3", titulo="Sem avaliações")
        session.add_all([com_resumo_errado, sem_resumo, sem_reviews])
        session.flush()
        session.add_all(
            [
                MovieReview(
                    sk_movie_id=com_resumo_errado.sk_movie_id, nome="A", nota=4, comentario="x"
                ),
                MovieReview(
                    sk_movie_id=com_resumo_errado.sk_movie_id, nome="B", nota=6.5, comentario="x"
                ),
                MovieReview(sk_movie_id=sem_resumo.sk_movie_id, nome="C", nota=9, comentario="x"),
                DimReview(
                    sk_movie_id=com_resumo_errado.sk_movie_id,
                    qtd_avaliacoes_usuarios=1,
                    nota_media_usuarios=1.0,
                ),
                DimReview(sk_movie_id=sem_reviews.sk_movie_id, qtd_avaliacoes_usuarios=3),
            ]
        )
        session.commit()

    with engine.begin() as conn:
        total = refresh_review_summaries(conn)

    with Session(engine) as session:
        resumos = {
            r.movie.titulo: (r.qtd_avaliacoes_usuarios, r.nota_media_usuarios)
            for r in session.scalars(select(DimReview))
        }

    assert total == 2
    assert resumos == {"Resumo errado": (2, 5.25), "Sem resumo": (1, 9.0)}
