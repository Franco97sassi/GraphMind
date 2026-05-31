1. Verificar Qdrant

Terminal:

docker ps

Tenés que ver qdrant.

También abrí:

http://localhost:6333/dashboard

y verificá que exista la colección:

habitos
2. Levantar backend

En backend:

node server.js

Deberías ver:

Servidor corriendo en puerto 3001
3. Levantar React

En frontend:

npm run dev

Abrí la URL que te muestre Vite, normalmente:

http://localhost:5173
4. Probar Function Calling

En el chat escribí:

Peso 80 kg, mido 1.75 y quiero saber mi IMC

Deberías ver en debug:

Herramientas usadas
calcularIMC
5. Probar RAG

Escribí:

¿Cómo puedo dormir mejor?

Deberías ver en debug:

Contexto RAG recuperado

con algo parecido a:

Para dormir mejor conviene evitar pantallas antes de acostarse.
6. Probar Semantic Search

Escribí:

¿Cómo puedo descansar mejor por la noche?

Aunque no diga exactamente “pantallas”, debería recuperar el chunk de dormir.

Eso prueba:

Semantic Search
7. Probar Retrieval

En debug mirá:

Chunks recuperados

Deberías ver varios chunks con:

{
  "score": 0.78,
  "texto": "..."
}

Eso prueba:

Retrieval
8. Probar caso mixto

Escribí:

Peso 80 kg, mido 1.75 y quiero una rutina principiante urgente

Debería usar herramientas como:

calcularIMC
generarRutina
clasificarPrioridad