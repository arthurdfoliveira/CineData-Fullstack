"""Schemas de resposta (Pydantic) do domínio de filmes."""
 
from datetime import date, datetime
from decimal import Decimal
from typing import Generic, TypeVar
 
from pydantic import BaseModel, ConfigDict
 
T = TypeVar("T")
 
 
class Page(BaseModel, Generic[T]):
    """Envelope de paginação genérico."""
 
    items: list[T]
    page: int
    page_size: int
    total: int
    total_pages: int
 
 
class MovieListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
 
    id_filme: str
    titulo: str
    ano_lancamento: int | None
    duracao_minutos: int | None
    status_filme: str | None
    url_poster: str | None
    nota_tmdb: float | None
    popularidade: float | None
    nota_media_usuarios: float | None
    qtd_avaliacoes_usuarios: int | None
 
 
class PersonSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)
 
    nome_pessoa: str
    tipo_pessoa: str
 
 
class MoviePerformance(BaseModel):
    model_config = ConfigDict(from_attributes=True)
 
    orcamento_usd: Decimal | None
    receita_usd: Decimal | None
    lucro_usd: Decimal
    orcamento_brl: Decimal | None
    receita_brl: Decimal | None
    lucro_brl: Decimal
    popularidade: float | None
    nota_tmdb: float | None
    qtd_tmdb: int | None
    nota_imdb: float | None
    qtd_imdb: int | None
 
 
class MovieDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)
 
    id_filme: str
    titulo: str
    data_lancamento: date | None
    ano_lancamento: int | None
    duracao_minutos: int | None
    status_filme: str | None
    sinopse: str | None
    url_poster: str | None
    url_backdrop: str | None
    generos: list[str]
    produtoras: list[str]
    elenco: list[PersonSummary]
    performance: MoviePerformance | None
    nota_media_usuarios: float | None
    qtd_avaliacoes_usuarios: int | None
 
 
class MovieReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
 
    nome: str
    nota: float
    comentario: str
    created_at: datetime