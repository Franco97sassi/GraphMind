const texto = `
Para mejorar hábitos, se recomienda empezar con acciones pequeñas.

Un hábito debe tener una señal, una rutina y una recompensa.

Para estudiar mejor conviene dividir el tiempo en bloques de 25 minutos.

La técnica Pomodoro ayuda a mantener la concentración.

Para dormir mejor se recomienda evitar pantallas antes de acostarse.

También es útil mantener horarios regulares.
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

const chunks = chunkText(texto);

console.log(`Cantidad de chunks: ${chunks.length}`);

chunks.forEach((chunk, index) => {
  console.log("\n----------------");
  console.log(`CHUNK ${index + 1}`);
  console.log("----------------");
  console.log(chunk);
});