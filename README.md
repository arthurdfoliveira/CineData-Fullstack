# CineData: Sistema de Gerenciamento e Avaliação de Filmes

Aplicação fullstack de catálogo e avaliação de filmes. Com ela dá pra navegar por um catálogo de mais de 95 mil filmes, buscar e filtrar, ver os detalhes de cada filme (ficha técnica, bilheteria e notas), publicar avaliações e cadastrar, editar e remover filmes.

## Stack

- **Frontend:** React 19 + TypeScript + Vite + React Router
- **Backend:** FastAPI + SQLAlchemy + SQLite + Alembic + Pydantic v2

---

## Pré-requisitos

- Python 3.11+
- Node.js 20.19+

---

## Como rodar o projeto

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Linux/Mac/WSL
# .venv\Scripts\activate         # Windows

pip install -e ".[dev]"
```

Crie o arquivo de variáveis de ambiente:

```bash
cp .env.example .env
```

Rode as migrations para criar as tabelas:

```bash
alembic upgrade head
```

O banco não vem versionado (os CSVs somam 223 MB, acima do limite do GitHub). Para popular, coloque os CSVs da atividade na pasta `backend/data/` e rode:

```bash
python -m app.db.seed
```

A carga leva cerca de 30 segundos. Para apagar tudo e carregar de novo, use `python -m app.db.seed --reset`.

Os arquivos esperados são:

- `dim_movies.csv`
- `dim_genres.csv`
- `dim_companies.csv`
- `dim_people.csv`
- `dim_reviews.csv`
- `movies_reviews.csv`
- `fact_movies_performance.csv`
- `bridge_movie_genre.csv`
- `bridge_movie_company.csv`
- `bridge_movie_person.csv`

Inicie o servidor:

```bash
uvicorn app.main:app --reload
```

API disponível em: http://localhost:8000  
Documentação Swagger: http://localhost:8000/docs

---

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend disponível em: http://localhost:5173

O Vite encaminha as chamadas `/api` para o backend em `localhost:8000`, então os dois precisam estar rodando ao mesmo tempo.

---

### 3. Testes

```bash
cd backend
pytest
```

Os testes usam um banco temporário, então não alteram o `rocketlab.db`.

---

## Funcionalidades

- Catálogo paginado com busca por título
- Filtro por gênero e ano, e ordenação por popularidade, nota, ano ou título
- Página de detalhes com sinopse, direção, roteiro, elenco, produtoras e bilheteria
- Notas dos usuários do CineData, do TMDB e do IMDb lado a lado
- Publicação de avaliações (nota de 0 a 10 + resenha), com a média recalculada na hora
- Lista paginada das avaliações de cada filme
- Cadastro, edição e remoção de filmes
- Tratamento de erros, estados de carregamento e layout responsivo

---

## Endpoints da API

Todas as rotas ficam sob o prefixo `/api/v1`.

| Método | Rota                         | Descrição                                  |
| ------ | ---------------------------- | ------------------------------------------ |
| GET    | `/movies`                    | Lista filmes com busca, filtros e paginação |
| GET    | `/genres`                    | Lista os gêneros disponíveis               |
| GET    | `/movies/{id}`               | Detalhes do filme com métricas e média     |
| POST   | `/movies`                    | Cadastrar filme                            |
| PUT    | `/movies/{id}`               | Atualizar filme                            |
| DELETE | `/movies/{id}`               | Remover filme (e suas avaliações)          |
| GET    | `/movies/{id}/reviews`       | Avaliações do filme, paginadas             |
| POST   | `/movies/{id}/reviews`       | Publicar avaliação                         |

### Parâmetros de busca (GET /movies)

| Parâmetro   | Tipo   | Descrição                                                                 |
| ----------- | ------ | ------------------------------------------------------------------------- |
| `search`    | string | Filtrar por parte do título                                               |
| `genero`    | string | Filtrar por gênero (nome exato)                                           |
| `ano`       | int    | Filtrar por ano de lançamento                                             |
| `order_by`  | string | `popularidade` (padrão), `nota_tmdb`, `ano_lancamento` ou `titulo`        |
| `order`     | string | `desc` (padrão) ou `asc`                                                  |
| `page`      | int    | Número da página (padrão: 1)                                              |
| `page_size` | int    | Itens por página (padrão: 20, máx: 100)                                   |

---

## Decisões de projeto

- **Nota de 0 a 10:** os CSVs já trazem cerca de 43 mil avaliações nessa escala. O sistema de avaliação foi feito com uma nota inteira de 0 a 10.
- **Filmes cadastrados pelo app ganham id com prefixo `cd-`**, pra não colidir com os ids do TMDB dos filmes da carga inicial.
- **O campo "Direção" aceita vários nomes separados por vírgula.** Mais de 9 mil filmes da base têm mais de um diretor. Ao editar um filme, só a direção muda, e elenco e roteiristas continuam iguais.

---

## Estrutura do Projeto

```
├── backend/
│   ├── app/
│   │   ├── api/v1/router.py   # Registro das rotas
│   │   ├── core/              # Configurações (.env) e logging
│   │   ├── db/
│   │   │   ├── base.py        # Base ORM
│   │   │   ├── session.py     # Configuração do banco
│   │   │   └── seed.py        # Carga dos CSVs
│   │   ├── movies/
│   │   │   ├── models.py      # Modelos SQLAlchemy (esquema estrela)
│   │   │   ├── schemas.py     # Schemas Pydantic
│   │   │   └── router.py      # Endpoints de filmes, gêneros e avaliações
│   │   └── main.py            # Aplicação FastAPI
│   ├── migrations/            # Migrations Alembic
│   ├── tests/                 # Testes (pytest)
│   ├── data/                  # CSVs para a carga (não versionados)
│   └── pyproject.toml
│
└── frontend/
    └── src/
        ├── api/               # Cliente HTTP, tipos e hook useFetch
        ├── components/        # MovieCard, MovieForm, ReviewForm, Pagination
        ├── pages/             # CatalogPage, MoviePage, MovieFormPage
        ├── format.ts          # Formatação de notas, datas e valores
        └── index.css          # Estilos globais
```
