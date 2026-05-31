import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { QdrantClient } from "@qdrant/js-client-rest";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

const qdrant = new QdrantClient({
  url: "http://localhost:6333",
});

const COLLECTION_NAME = "habitos";

const texto = `
Para mejorar hábitos se recomienda empezar con acciones pequeñas.

La técnica Pomodoro ayuda a mejorar la concentración.

Para dormir mejor conviene evitar pantallas antes de acostarse.
`;

function chunkText(text, chunkSize = 100, overlap = 20) {
  const chunks = [];

  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;

    chunks.push(text.slice(start, end));

    start += chunkSize - overlap;
  }

  return chunks;
}

async function generarEmbedding(texto) {
  const result = await embeddingModel.embedContent(texto);

  return result.embedding.values;
}

async function main() {
  const chunks = chunkText(texto);

  console.log("Chunks generados:", chunks.length);

  try {
    await qdrant.deleteCollection(COLLECTION_NAME);
  } catch {}

  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: {
      size: 3072,
      distance: "Cosine",
    },
  });

  const points = [];

  for (let i = 0; i < chunks.length; i++) {
    const vector = await generarEmbedding(chunks[i]);

    points.push({
      id: i + 1,
      vector,
      payload: {
        text: chunks[i],
      },
    });
  }

  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points,
  });

  console.log("Vectores guardados en Qdrant");
}

main();