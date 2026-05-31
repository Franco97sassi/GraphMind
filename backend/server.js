import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ejecutarAgente } from "./agent-graph.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

let historial = [];

app.post("/api/chat", async (req, res) => {
  try {
    const { mensaje } = req.body;

    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({
        error: "El mensaje es obligatorio",
      });
    }

    const usuarioId = "franco";

    historial.push({
      role: "user",
      content: mensaje,
    });

    const resultado = await ejecutarAgente({
      mensaje,
      historial,
      usuarioId,
    });

    historial.push({
      role: "assistant",
      content: resultado.respuesta,
    });

    res.json({
      respuesta: resultado.respuesta,
      debug: {
        memoria: resultado.memoria,
        rag: resultado.rag,
        plan: resultado.plan,
        pensamiento: resultado.pensamiento,
        accion: resultado.accion,
        observaciones: resultado.observaciones,
        iteracion: resultado.iteracion,
        total_mensajes_guardados: historial.length,
      },
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Error al generar respuesta",
      detalle: error.message,
    });
  }
});

app.post("/api/reset", (req, res) => {
  historial = [];

  res.json({
    mensaje: "Historial de sesión eliminado. La memoria persistente sigue guardada.",
  });
});
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { mensaje } = req.body;

    if (!mensaje || !mensaje.trim()) {
      return res.status(400).json({
        error: "El mensaje es obligatorio",
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const usuarioId = "franco";

    historial.push({
      role: "user",
      content: mensaje,
    });

    res.write(
      `event: status\ndata: ${JSON.stringify({
        estado: "procesando_agente",
      })}\n\n`
    );

    const resultado = await ejecutarAgente({
      mensaje,
      historial,
      usuarioId,
    });

    historial.push({
      role: "assistant",
      content: resultado.respuesta,
    });

    const palabras = resultado.respuesta.split(" ");

    for (const palabra of palabras) {
      res.write(
        `event: chunk\ndata: ${JSON.stringify({
          texto: palabra + " ",
        })}\n\n`
      );

      await new Promise((resolve) => setTimeout(resolve, 25));
    }

    res.write(
      `event: done\ndata: ${JSON.stringify({
        debug: {
          memoria: resultado.memoria,
          rag: resultado.rag,
          plan: resultado.plan,
          pensamiento: resultado.pensamiento,
          accion: resultado.accion,
          observaciones: resultado.observaciones,
          iteracion: resultado.iteracion,
          total_mensajes_guardados: historial.length,
        },
      })}\n\n`
    );

    res.end();
  } catch (error) {
    console.error(error);

    res.write(
      `event: error\ndata: ${JSON.stringify({
        error: "Error al generar respuesta",
        detalle: error.message,
      })}\n\n`
    );

    res.end();
  }
});
app.listen(process.env.PORT, () => {
  console.log(`Servidor corriendo en puerto ${process.env.PORT}`);
});