function validarArgumentos(argumentos, schema) {
  for (const [campo, tipo] of Object.entries(schema)) {
    if (!(campo in argumentos)) {
      return `Falta el argumento obligatorio: ${campo}`;
    }

    if (tipo === "number" && typeof argumentos[campo] !== "number") {
      return `El argumento ${campo} debe ser number`;
    }

    if (tipo === "string" && typeof argumentos[campo] !== "string") {
      return `El argumento ${campo} debe ser string`;
    }
  }

  return null;
}

export const herramientasDisponibles = {
  calcularIMC: {
    descripcion: "Calcula el índice de masa corporal.",
    schema: {
      peso: "number",
      altura: "number",
    },
    ejecutar: ({ peso, altura }) => {
      const imc = peso / (altura * altura);

      let categoria = "normal";
      if (imc < 18.5) categoria = "bajo peso";
      else if (imc >= 25 && imc < 30) categoria = "sobrepeso";
      else if (imc >= 30) categoria = "obesidad";

      return {
        imc: Number(imc.toFixed(2)),
        categoria,
      };
    },
  },

  calcularEdad: {
    descripcion: "Calcula la edad a partir del año de nacimiento.",
    schema: {
      anioNacimiento: "number",
    },
    ejecutar: ({ anioNacimiento }) => {
      return {
        edad: new Date().getFullYear() - anioNacimiento,
      };
    },
  },

  clasificarPrioridad: {
    descripcion: "Clasifica la prioridad de una tarea o mensaje.",
    schema: {
      texto: "string",
    },
    ejecutar: ({ texto }) => {
      const textoLower = texto.toLowerCase();

      if (
        textoLower.includes("urgente") ||
        textoLower.includes("rápido") ||
        textoLower.includes("hoy")
      ) {
        return { prioridad: "alta" };
      }

      if (textoLower.includes("esta semana") || textoLower.includes("pronto")) {
        return { prioridad: "media" };
      }

      return { prioridad: "baja" };
    },
  },

  generarRutina: {
    descripcion: "Genera una rutina básica de ejercicio según el nivel.",
    schema: {
      nivel: "string",
    },
    ejecutar: ({ nivel }) => {
      const rutinas = {
        principiante: [
          "Caminar 20 minutos",
          "Sentadillas 3x10",
          "Flexiones apoyando rodillas 3x8",
        ],
        intermedio: ["Trote 25 minutos", "Sentadillas 4x12", "Flexiones 4x10"],
        avanzado: ["Correr 40 minutos", "Burpees 4x15", "Flexiones 5x15"],
      };

      return {
        nivel,
        rutina: rutinas[nivel] || rutinas.principiante,
      };
    },
  },
};

export function obtenerDescripcionHerramientas() {
  return Object.entries(herramientasDisponibles)
    .map(([nombre, tool]) => {
      return `
Nombre: ${nombre}
Descripción: ${tool.descripcion}
Argumentos:
${JSON.stringify(tool.schema, null, 2)}
`;
    })
    .join("\n");
}

export function ejecutarHerramienta(nombre, argumentos = {}) {
  const tool = herramientasDisponibles[nombre];

  if (!tool) {
    return {
      ok: false,
      error: `La herramienta "${nombre}" no existe.`,
    };
  }

  const errorValidacion = validarArgumentos(argumentos, tool.schema);

  if (errorValidacion) {
    return {
      ok: false,
      error: errorValidacion,
    };
  }

  try {
    const resultado = tool.ejecutar(argumentos);

    return {
      ok: true,
      resultado,
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
    };
  }
}