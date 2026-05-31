// import dotenv from "dotenv";
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { QdrantClient } from "@qdrant/js-client-rest";

// dotenv.config();

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// const embeddingModel = genAI.getGenerativeModel({
//   model: "gemini-embedding-001",
// });

// const chatModel = genAI.getGenerativeModel({
//   model: "gemini-2.5-flash-lite",
// });

// const qdrant = new QdrantClient({
//   url: "http://localhost:6333",
// });

// const COLLECTION_NAME = "habitos";

// async function generarEmbedding(texto) {
//   const result = await embeddingModel.embedContent(texto);
//   return result.embedding.values;
// }

// async function recuperarContexto(pregunta) {
//   const vectorPregunta = await generarEmbedding(pregunta);

//   const resultados = await qdrant.search(COLLECTION_NAME, {
//     vector: vectorPregunta,
//     limit: 3,
//   });

//   return resultados
//     .map((r, index) => `Fuente ${index + 1}:\n${r.payload.text}`)
//     .join("\n\n");
// }

// export async function responderConRag(pregunta) {
//   const contexto = await recuperarContexto(pregunta);

//   const prompt = `
// Sos un asistente experto en hábitos.

// Respondé usando SOLO el siguiente contexto.
// Si la respuesta no está en el contexto, decí:
// "No tengo información suficiente en los documentos."

// Contexto:
// ${contexto}

// Pregunta:
// ${pregunta}
// `;

//   const result = await chatModel.generateContent(prompt);

//   return {
//     respuesta: result.response.text(),
//     contexto,
//   };
// }





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

export async function recuperarContextoRag(pregunta) {
  const vectorPregunta = await generarEmbedding(pregunta);

  const resultados = await qdrant.search(COLLECTION_NAME, {
    vector: vectorPregunta,
    limit: 3,
  });

  const contexto = resultados
    .map((r, index) => `Fuente ${index + 1}:\n${r.payload.text}`)
    .join("\n\n");

  return {
    contexto,
    chunks: resultados.map((r) => ({
      score: r.score,
      texto: r.payload.text,
    })),
  };
}