import httpx

URL = "/api/v1/movies/1/reviews"


async def test_create_review_updates_summary(client: httpx.AsyncClient) -> None:
    first = await client.post(URL, json={"nome": "Ana", "nota": 8, "comentario": "Muito bom"})
    await client.post(URL, json={"nome": "Beto", "nota": 5, "comentario": "Ok"})

    assert first.status_code == 201
    assert first.json()["nome"] == "Ana"
    assert "sk_movie_review_id" in first.json()

    detail = (await client.get("/api/v1/movies/1")).json()
    assert detail["qtd_avaliacoes_usuarios"] == 2
    assert detail["nota_media_usuarios"] == 6.5

    reviews = (await client.get(URL)).json()
    assert reviews["total"] == 2


async def test_create_review_validates_payload(client: httpx.AsyncClient) -> None:
    fora_da_escala = await client.post(URL, json={"nome": "Ana", "nota": 11, "comentario": "x"})
    nome_vazio = await client.post(URL, json={"nome": "   ", "nota": 5, "comentario": "x"})

    assert fora_da_escala.status_code == 422
    assert nome_vazio.status_code == 422


async def test_create_review_unknown_movie_returns_404(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/api/v1/movies/nao-existe/reviews", json={"nome": "Ana", "nota": 5, "comentario": "x"}
    )

    assert response.status_code == 404


async def test_list_genres_returns_sorted_names(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/genres")

    assert response.status_code == 200
    assert response.json() == ["Action", "Drama"]
