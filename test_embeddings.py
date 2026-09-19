import asyncio
from app.services.embeddings.deterministic import DeterministicEmbeddingService
from app.services.rag import cosine_similarity

async def test():
    service = DeterministicEmbeddingService()
    doc_text = "Acme Corp 2026 Fiyat Listesi. Standart Paket: 15.000 TL, Kurumsal Paket: 45.000 TL. Yillik pesin odemelerde %15 iskonto uygulanir."
    query1 = "fiyat listesi ve iskontolar nelerdir?"
    query2 = "kurumsal paket fiyati nedir?"
    query3 = "yukledigim dosyada ne yaziyor?"
    query4 = "merhaba nasilsin"

    doc_emb = await service.get_embedding(doc_text)
    for q in [query1, query2, query3, query4]:
        q_emb = await service.get_embedding(q)
        sim = cosine_similarity(doc_emb, q_emb)
        print(f"Query: '{q}' -> Similarity: {sim:.4f}")

asyncio.run(test())
