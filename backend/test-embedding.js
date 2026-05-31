import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

const result = await model.embedContent(
  "Quiero mejorar mis hábitos de sueño"
);

const embedding = result.embedding.values;

console.log("Dimensiones del embedding:", embedding.length);
console.log("Primeros valores:", embedding.slice(0, 5));