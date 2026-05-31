import crypto from "crypto";
import { QdrantClient } from "@qdrant/js-client-rest";
import { GoogleGenerativeAI } from "@google/generative-ai";

const COLLECTION_NAME = "memoria_agente_v2";
const qdrant = new QdrantClient({
  url: "http://localhost:6333",
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

async function generarEmbedding(texto) {
  try {
    const result = await embeddingModel.embedContent(texto);
    return result.embedding.values;
  } catch (error) {
    console.error("Error generando embedding:", error.message);

    throw new Error(
      "No se pudo generar el embedding. Revisá GEMINI_API_KEY, internet o acceso a Gemini."
    );
  }
}

export async function asegurarColeccionMemoria() {
  const collections = await qdrant.getCollections();

  const existe = collections.collections.some(
    (c) => c.name === COLLECTION_NAME
  );

  if (existe) return;

  await qdrant.createCollection(COLLECTION_NAME, {
    vectors: {
  size: 3072,
      distance: "Cosine",
    },
  });
}

export async function guardarMemoria(usuarioId, texto) {
  await asegurarColeccionMemoria();

  const vector = await generarEmbedding(texto);

  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points: [
      {
        id: crypto.randomUUID(),
        vector,
        payload: {
          usuarioId,
          texto,
          fecha: new Date().toISOString(),
        },
      },
    ],
  });
}

export async function recuperarMemoria(usuarioId, consulta) {
  await asegurarColeccionMemoria();

  const vector = await generarEmbedding(consulta);

  const resultados = await qdrant.search(COLLECTION_NAME, {
    vector,
    limit: 5,
    filter: {
      must: [
        {
          key: "usuarioId",
          match: {
            value: usuarioId,
          },
        },
      ],
    },
  });

  return resultados.map((r) => ({
    score: r.score,
    texto: r.payload.texto,
    fecha: r.payload.fecha,
  }));
}