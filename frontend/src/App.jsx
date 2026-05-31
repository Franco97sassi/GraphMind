import { useState } from "react";
import axios from "axios";

function App() {
  const [mensaje, setMensaje] = useState("");
  const [chat, setChat] = useState([]);
  const [debug, setDebug] = useState(null);
  const [loading, setLoading] = useState(false);

  const enviarMensaje = async () => {
  if (!mensaje.trim()) return;

  try {
    setLoading(true);

    const textoUsuario = mensaje;

    setChat((prev) => [
      ...prev,
      {
        role: "user",
        content: textoUsuario,
      },
      {
        role: "assistant",
        content: "",
        streaming: true,
      },
    ]);

    setMensaje("");
    setDebug(null);

    const response = await fetch("http://localhost:3001/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mensaje: textoUsuario,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error("Error al comunicarse con el servidor");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const eventos = buffer.split("\n\n");
      buffer = eventos.pop() || "";

      for (const evento of eventos) {
        const eventLine = evento
          .split("\n")
          .find((line) => line.startsWith("event:"));

        const dataLine = evento
          .split("\n")
          .find((line) => line.startsWith("data:"));

        if (!eventLine || !dataLine) continue;

        const eventName = eventLine.replace("event:", "").trim();
        const data = JSON.parse(dataLine.replace("data:", "").trim());

        if (eventName === "chunk") {
          setChat((prev) => {
            const nuevoChat = [...prev];
            const ultimoIndex = nuevoChat.length - 1;

            nuevoChat[ultimoIndex] = {
              ...nuevoChat[ultimoIndex],
              content: nuevoChat[ultimoIndex].content + data.texto,
            };

            return nuevoChat;
          });
        }

        if (eventName === "done") {
          setDebug(data.debug);

          setChat((prev) => {
            const nuevoChat = [...prev];
            const ultimoIndex = nuevoChat.length - 1;

            nuevoChat[ultimoIndex] = {
              ...nuevoChat[ultimoIndex],
              streaming: false,
            };

            return nuevoChat;
          });
        }

        if (eventName === "error") {
          throw new Error(data.error || "Error en streaming");
        }
      }
    }
  } catch (error) {
    console.error(error);
    alert(error.message || "Error al comunicarse con el servidor");
  } finally {
    setLoading(false);
  }
};
  const limpiarChat = async () => {
    try {
      await axios.post("http://localhost:3001/api/reset");

      setChat([]);
      setDebug(null);
    } catch (error) {
      console.error(error);
      alert("Error al limpiar el chat");
    }
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "20px auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1>AI Personal Assistant + RAG + LangGraph ReAct</h1>

      <p>
        Chat con memoria, herramientas, RAG, Qdrant, embeddings, planificación y
        ReAct Loop.
      </p>

      <button onClick={limpiarChat}>Reiniciar conversación</button>

      <div
        style={{
          marginTop: "20px",
          border: "1px solid #ddd",
          minHeight: "350px",
          padding: "15px",
          borderRadius: "8px",
          background: "#fafafa",
        }}
      >
        {chat.length === 0 && (
          <p style={{ color: "#777" }}>
            Escribí algo como: “Peso 80 kg, mido 1.75 y quiero una rutina
            principiante urgente”.
          </p>
        )}

        {chat.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: "15px",
              textAlign: msg.role === "user" ? "right" : "left",
            }}
          >
            <strong>{msg.role === "user" ? "Tú" : "IA"}</strong>

            <div
              style={{
                display: "inline-block",
                marginTop: "5px",
                padding: "10px",
                borderRadius: "8px",
                background: msg.role === "user" ? "#dbeafe" : "#e5e7eb",
                maxWidth: "80%",
                whiteSpace: "pre-wrap",
              }}
            >
{msg.content}
{msg.streaming && <span>▌</span>}            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "20px",
        }}
      >
        <input
          type="text"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") enviarMensaje();
          }}
          placeholder="Escribí tu mensaje..."
          style={{
            flex: 1,
            padding: "10px",
          }}
        />

        <button onClick={enviarMensaje} disabled={loading || !mensaje.trim()}>
          {loading ? "Enviando..." : "Enviar"}
        </button>
      </div>

      {debug && (
        <div
          style={{
            marginTop: "25px",
            padding: "15px",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <h2>Debug técnico</h2>

          {debug.tokens && (
            <>
              <p>
                <strong>Tokens entrada:</strong> {debug.tokens.entrada}
              </p>

              <p>
                <strong>Tokens salida:</strong> {debug.tokens.salida}
              </p>

              <p>
                <strong>Tokens total:</strong> {debug.tokens.total}
              </p>

              <p>
                <strong>Costo estimado:</strong> USD{" "}
                {debug.tokens.costo_estimado_usd}
              </p>
            </>
          )}

          <h3>Plan del agente</h3>

          <pre
            style={{
              background: "#1e293b",
              color: "#f8fafc",
              padding: "15px",
              borderRadius: "8px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(debug.plan || {}, null, 2)}
          </pre>

          <h3>ReAct Loop</h3>

          <pre
            style={{
              background: "#111827",
              color: "#f9fafb",
              padding: "15px",
              borderRadius: "8px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(
              {
                pensamiento: debug.pensamiento,
                accion: debug.accion,
                observaciones: debug.observaciones,
              },
              null,
              2
            )}
          </pre>

          <h3>Contexto RAG recuperado</h3>

          <pre
            style={{
              background: "#064e3b",
              color: "#ecfdf5",
              padding: "15px",
              borderRadius: "8px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {debug.rag?.contexto || "No se recuperó contexto RAG."}
          </pre>

          <h3>Chunks recuperados</h3>

          <pre
            style={{
              background: "#111827",
              color: "#f9fafb",
              padding: "15px",
              borderRadius: "8px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(debug.rag?.chunks || [], null, 2)}
          </pre>

          <h3>Estado completo del agente</h3>

          <pre
            style={{
              background: "#020617",
              color: "#e5e7eb",
              padding: "15px",
              borderRadius: "8px",
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {JSON.stringify(debug, null, 2)}
          </pre>

          <h3>Plan del agente</h3>
          <h3>Memoria persistente recuperada</h3>

<pre
  style={{
    background: "#3b0764",
    color: "#f5f3ff",
    padding: "15px",
    borderRadius: "8px",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
  }}
>
  {JSON.stringify(debug.memoria || [], null, 2)}
</pre>
        </div>
      )}
    </div>
  );
}

export default App;