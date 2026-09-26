import httpx

URL = "/api/v1/movies"

NOVO_FILME = {
    "titulo": "Filme Novo",
    "diretor": "Diretora Teste",
    "ano_lancamento": 2024,
    "generos": ["Drama"],
    "sinopse": "Uma sinopse.",
}


async def test_create_movie(client: httpx.AsyncClient) -> None:
    response = await client.post(URL, json=NOVO_FILME)

    assert response.status_code == 201
    body = response.json()
    assert body["id_filme"].startswith("cd-")
    assert body["titulo"] == "Filme Novo"
    assert body["generos"] == ["Drama"]
    assert body["elenco"] == [{"nome_pessoa": "Diretora Teste", "tipo_pessoa": "Diretor"}]

    busca = (await client.get(URL, params={"search": "novo"})).json()
    assert busca["total"] == 1


async def test_create_movie_validates_payload(client: httpx.AsyncClient) -> None:
    sem_titulo = await client.post(URL, json={**NOVO_FILME, "titulo": "  "})
    genero_invalido = await client.post(URL, json={**NOVO_FILME, "generos": ["Inexistente"]})
    url_invalida = await client.post(URL, json={**NOVO_FILME, "url_poster": "poster.jpg"})

    assert sem_titulo.status_code == 422
    assert genero_invalido.status_code == 422
    assert url_invalida.status_code == 422


async def test_movie_accepts_several_directors(client: httpx.AsyncClient) -> None:
    response = await client.post(URL, json={**NOVO_FILME, "diretor": "Diretor A, Diretor B"})

    nomes = {p["nome_pessoa"] for p in response.json()["elenco"] if p["tipo_pessoa"] == "Diretor"}
    assert nomes == {"Diretor A", "Diretor B"}
