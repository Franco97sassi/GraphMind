import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { recuperarContextoRag } from "./rag-service.js";
import { guardarMemoria, recuperarMemoria } from "./memory-service.js";
import {
  ejecutarHerramienta,
  obtenerDescripcionHerramientas,
} from "./tools.js";
import { MemorySaver } from "@langchain/langgraph-checkpoint";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// function calcularIMC(peso, altura) {
//   const imc = peso / (altura * altura);

//   let categoria = "normal";
//   if (imc < 18.5) categoria = "bajo peso";
//   else if (imc >= 25 && imc < 30) categoria = "sobrepeso";
//   else if (imc >= 30) categoria = "obesidad";

//   return {
//     imc: Number(imc.toFixed(2)),
//     categoria,
//   };
// }

// function calcularEdad(anioNacimiento) {
//   return {
//     edad: new Date().getFullYear() - anioNacimiento,
//   };
// }

// function clasificarPrioridad(texto) {
//   const textoLower = texto.toLowerCase();

//   if (
//     textoLower.includes("urgente") ||
//     textoLower.includes("rápido") ||
//     textoLower.includes("hoy")
//   ) {
//     return { prioridad: "alta" };
//   }

//   if (textoLower.includes("esta semana") || textoLower.includes("pronto")) {
//     return { prioridad: "media" };
//   }

//   return { prioridad: "baja" };
// }

// function generarRutina(nivel) {
//   const rutinas = {
//     principiante: [
//       "Caminar 20 minutos",
//       "Sentadillas 3x10",
//       "Flexiones apoyando rodillas 3x8",
//     ],
//     intermedio: ["Trote 25 minutos", "Sentadillas 4x12", "Flexiones 4x10"],
//     avanzado: ["Correr 40 minutos", "Burpees 4x15", "Flexiones 5x15"],
//   };

//   return {
//     nivel,
//     rutina: rutinas[nivel] || rutinas.principiante,
//   };
// }

// const herramientasDisponibles = {
//   calcularIMC,
//   calcularEdad,
//   clasificarPrioridad,
//   generarRutina,
// };

const AgentState = Annotation.Root({
  usuarioId: Annotation(),
  mensaje: Annotation(),
  historial: Annotation(),
  memoria: Annotation(),
  rag: Annotation(),
  plan: Annotation(),
  pensamiento: Annotation(),
  accion: Annotation(),
  observaciones: Annotation({
    reducer: (actual = [], nuevo = []) => actual.concat(nuevo),
    default: () => [],
  }),
  iteracion: Annotation(),
  respuesta: Annotation(),
});

// async function generarJsonConGemini(prompt) {
//   const model = genAI.getGenerativeModel({
//     model: "gemini-2.5-flash-lite",
//   });

//   const result = await model.generateContent(prompt);

//   const text = result.response
//     .text()
//     .replace(/```json/g, "")
//     .replace(/```/g, "")
//     .trim();

//   return JSON.parse(text);
// }

async function generarJsonConGemini(prompt) {
  if (process.env.USE_MOCK_AI === "true") {
    return {
      objetivo: "Probar el flujo del agente sin consumir Gemini",
      pasos: ["Recuperar memoria", "Recuperar RAG", "Ejecutar herramienta", "Responder"],
      herramientas_posibles: ["calcularIMC"],
      tipo: "herramienta",
      pensamiento: "Modo mock: ejecuto una herramienta de prueba.",
      funcion: "calcularIMC",
      argumentos: {
        peso: 80,
        altura: 1.75,
      },
    };
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
  });

  const result = await model.generateContent(prompt);

  const text = result.response
    .text()
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(text);
}
// async function generarTextoConGemini(prompt) {
//   const model = genAI.getGenerativeModel({
//     model: "gemini-2.5-flash-lite",
//   });

//   const result = await model.generateContent(prompt);

//   return result.response.text();
// }
async function generarTextoConGemini(prompt) {
  if (process.env.USE_MOCK_AI === "true") {
    return "Modo mock activo: el agente ejecutó el flujo LangGraph con memoria, RAG, planning, ReAct Loop y tools sin consumir cuota de Gemini.";
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
  });

  const result = await model.generateContent(prompt);

  return result.response.text();
}

// async function nodoMemoria(state) {
//   try {
//     const recuerdos = await recuperarMemoria(state.usuarioId, state.mensaje);

//     return {
//       memoria: recuerdos,
//     };
//   } catch (error) {
//     console.error("Error recuperando memoria:", error.message);

//     return {
//       memoria: [],
//     };
//   }
// }
async function nodoMemoria(state) {
  if (process.env.USE_MOCK_AI === "true") {
    return {
      memoria: [
        {
          score: 1,
          texto: "Memoria mock: el usuario está probando un AI Agent con LangGraph.",
          fecha: new Date().toISOString(),
        },
      ],
    };
  }

  try {
    const recuerdos = await recuperarMemoria(state.usuarioId, state.mensaje);

    return {
      memoria: recuerdos,
    };
  } catch (error) {
    console.error("Error recuperando memoria:", error.message);

    return {
      memoria: [],
    };
  }
}

async function nodoRag(state) {
  const rag = await recuperarContextoRag(state.mensaje);

  return {
    rag,
  };
}

async function nodoPlanning(state) {
  const contextoChat = state.historial
    .slice(-10)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const prompt = `
Sos el planner de un AI Agent.

Creá un plan breve para resolver el pedido del usuario.
No ejecutes herramientas.
No respondas al usuario final.

Memoria persistente del usuario:
${JSON.stringify(state.memoria || [], null, 2)}

Contexto RAG:
${state.rag?.contexto || "No se recuperó contexto relevante."}

Historial reciente:
${contextoChat}

Mensaje del usuario:
${state.mensaje}
 
Herramientas disponibles:
${obtenerDescripcionHerramientas()}

Respondé SOLO JSON válido:

{
  "objetivo": "objetivo del usuario",
  "pasos": ["paso 1", "paso 2"],
  "herramientas_posibles": ["calcularIMC"]
}
`;

  const plan = await generarJsonConGemini(prompt);

  return {
    plan,
    iteracion: 0,
    observaciones: [],
  };
}

async function nodoPensar(state) {
  const prompt = `
Sos el cerebro de un AI Agent con patrón ReAct.

Tenés que decidir el próximo paso.

Podés:
1. Ejecutar UNA herramienta.
2. Finalizar y responder al usuario.

Mensaje del usuario:
${state.mensaje}

Memoria persistente:
${JSON.stringify(state.memoria || [], null, 2)}

Plan:
${JSON.stringify(state.plan, null, 2)}

Contexto RAG:
${state.rag?.contexto || "No se recuperó contexto relevante."}

Observaciones de herramientas ya ejecutadas:
${JSON.stringify(state.observaciones || [], null, 2)}

Iteración actual:
${state.iteracion}

Herramientas disponibles:

1. calcularIMC
Argumentos:
{
  "peso": number,
  "altura": number
}

2. calcularEdad
Argumentos:
{
  "anioNacimiento": number
}

3. clasificarPrioridad
Argumentos:
{
  "texto": string
}

4. generarRutina
Argumentos:
{
  "nivel": "principiante" | "intermedio" | "avanzado"
}

Reglas:
- Si ya tenés información suficiente, finalizá.
- No repitas una herramienta con los mismos argumentos.
- Máximo 3 iteraciones.
- Respondé SOLO JSON válido.

Formato para usar herramienta:
{
  "tipo": "herramienta",
  "pensamiento": "por qué necesito esta herramienta",
  "funcion": "calcularIMC",
  "argumentos": {
    "peso": 80,
    "altura": 1.75
  }
}

Formato para finalizar:
{
  "tipo": "final",
  "pensamiento": "por qué ya puedo responder"
}
`;

  const accion = await generarJsonConGemini(prompt);

  return {
    pensamiento: accion.pensamiento,
    accion,
  };
}

function nodoEjecutarHerramienta(state) {
  const { funcion, argumentos } = state.accion;

  const resultado = ejecutarHerramienta(funcion, argumentos);

  return {
    observaciones: [
      {
        funcion,
        argumentos,
        ...resultado,
      },
    ],
    iteracion: state.iteracion + 1,
  };
}
async function nodoRespuestaFinal(state) {
  const prompt = `
Respondé al usuario de forma clara, breve y útil.

Mensaje del usuario:
${state.mensaje}

Memoria persistente:
${JSON.stringify(state.memoria || [], null, 2)}

Contexto RAG:
${state.rag?.contexto || "No se recuperó contexto relevante."}

Plan:
${JSON.stringify(state.plan, null, 2)}

Herramientas ejecutadas y observaciones:
${JSON.stringify(state.observaciones || [], null, 2)}

Respuesta final:
`;

  const respuesta = await generarTextoConGemini(prompt);

  if (process.env.USE_MOCK_AI !== "true") {
  await guardarMemoria(
    state.usuarioId,
    `
Usuario: ${state.mensaje}

Respuesta del agente:
${respuesta}

Plan:
${JSON.stringify(state.plan, null, 2)}

Observaciones:
${JSON.stringify(state.observaciones || [], null, 2)}
`
  );
}

  return {
    respuesta,
  };
}

function decidirDespuesDePensar(state) {
  if (state.iteracion >= 1) {
    return "generarRespuestaFinal";
  }

  if (state.accion?.tipo === "herramienta") {
    return "ejecutarHerramienta";
  }

  return "generarRespuestaFinal";
}
  
function decidirDespuesDeHerramienta(state) {
  if (state.iteracion >= 1) {
    return "generarRespuestaFinal";
  }

  return "pensar";
}
const checkpointer = new MemorySaver();

const graph = new StateGraph(AgentState)
  .addNode("recuperarMemoria", nodoMemoria)
  .addNode("recuperarRag", nodoRag)
  .addNode("planificar", nodoPlanning)
  .addNode("pensar", nodoPensar)
  .addNode("ejecutarHerramienta", nodoEjecutarHerramienta)
  .addNode("generarRespuestaFinal", nodoRespuestaFinal)

  .addEdge(START, "recuperarMemoria")
  .addEdge("recuperarMemoria", "recuperarRag")
  .addEdge("recuperarRag", "planificar")
  .addEdge("planificar", "pensar")

  .addConditionalEdges("pensar", decidirDespuesDePensar)
  .addConditionalEdges("ejecutarHerramienta", decidirDespuesDeHerramienta)

  .addEdge("generarRespuestaFinal", END)

  .compile();

export async function ejecutarAgente({ mensaje, historial, usuarioId }) {
  return await graph.invoke(
    {
      usuarioId,
      mensaje,
      historial,
      memoria: [],
      rag: null,
      plan: null,
      pensamiento: null,
      accion: null,
      observaciones: [],
      iteracion: 0,
      respuesta: "",
    },
    {
      configurable: {
        thread_id: usuarioId,
      },
    }
  );
}