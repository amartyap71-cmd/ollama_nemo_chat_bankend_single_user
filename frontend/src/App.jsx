
import { useState, useRef, useEffect } from "react";
import "./App.css";

export default function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  async function sendMessage(e) {
    e.preventDefault();

    const userMessage = message.trim();
    if (!userMessage || loading) return;

    setMessage("");
    setLoading(true);

    // Immediately show the user's message and an empty AI response.
    setChat((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("http://localhost:4000/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      if (!res.body) throw new Error("Streaming is not supported.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });

        setChat((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];

          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + text,
            };
          }

          return updated;
        });
      }

      const remaining = decoder.decode();

      if (remaining) {
        setChat((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];

          if (last?.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + remaining,
            };
          }

          return updated;
        });
      }
    } catch (error) {
      setChat((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];

        if (last?.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: `Error: ${error.message}`,
          };
        }

        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Nemotron Chat</h1>
        <p>Express + Ollama · Streaming AI</p>
      </header>

      <main className="chat">
        <div className="messages">
          {chat.length === 0 && (
            <div className="empty">
              <h2>Start a conversation</h2>
              <p>Type a message below to chat with Nemotron.</p>
            </div>
          )}

          {chat.map((item, index) => (
            <div
              key={index}
              className={`message ${item.role}`}
            >
              <div className="role">
                {item.role === "user" ? "You" : "Nemotron"}
              </div>

              <div className="bubble">
                <pre>
                  {item.content ||
                    (item.role === "assistant" && loading
                      ? "Thinking..."
                      : "")}
                </pre>
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        <form onSubmit={sendMessage}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading || !message.trim()}
          >
            {loading ? "Generating..." : "Send"}
          </button>
        </form>
      </main>
    </div>
  );
}
