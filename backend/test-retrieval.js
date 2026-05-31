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

async function generarEmbedding(texto) {
  const result = await embeddingModel.embedContent(texto);
  return result.embedding.values;
}

async function recuperarContexto(pregunta) {
  const vectorPregunta = await generarEmbedding(pregunta);

  const resultados = await qdrant.search(COLLECTION_NAME, {
    vector: vectorPregunta,
    limit: 3,
  });

  const contexto = resultados
    .map((r, index) => `Fuente ${index + 1}:\n${r.payload.text}`)
    .join("\n\n");

  return contexto;
}

const pregunta = "¿Cómo puedo estudiar mejor?";

const contexto = await recuperarContexto(pregunta);

console.log("Pregunta:");
console.log(pregunta);

console.log("\nContexto recuperado:");
console.log(contexto);