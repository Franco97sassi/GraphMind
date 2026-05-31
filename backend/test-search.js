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

async function buscar(pregunta) {
  const vectorPregunta = await generarEmbedding(pregunta);

  const resultados = await qdrant.search(COLLECTION_NAME, {
    vector: vectorPregunta,
    limit: 3,
  });

  console.log("\nPregunta:");
  console.log(pregunta);

  console.log("\nResultados:");

  resultados.forEach((r, i) => {
    console.log("\n----------------");
    console.log(`Resultado ${i + 1}`);
    console.log("----------------");
    console.log("Score:", r.score);
    console.log("Texto:", r.payload.text);
  });
}

buscar("¿Cómo puedo dormir mejor?");