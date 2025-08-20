import { useState, useEffect, useRef } from "react";

function App() {
  const [usernameInput, setUsernameInput] = useState(""); // typing state
  const [username, setUsername] = useState(""); // registered username
  const [target, setTarget] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket("ws://localhost:8080");

    ws.current.onopen = () => {
      console.log("✅ Connected to server");
    };

    ws.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "private") {
        setMessages((prev) => [...prev, msg]);
      } else if (msg.type === "history") {
        setMessages(msg.data);
      }
    };

    ws.current.onclose = () => {
      console.log("❌ Disconnected from server");
    };

    return () => {
      ws.current.close();
    };
  }, []);

  useEffect(() => {
    if (target && username && ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({ type: "history", from: username, to: target })
      );
    }
  }, [target, username]);

  const register = () => {
    if (usernameInput.trim().length < 3) {
      alert("Username must be at least 3 characters long!");
      return;
    }
    setUsername(usernameInput); // ✅ set final username
    ws.current.send(JSON.stringify({ type: "register", username: usernameInput }));
  };

  const sendMessage = () => {
    if (input.trim() !== "" && target) {
      const msg = {
        type: "private",
        from: username,
        to: target,
        text: input,
      };
      ws.current.send(JSON.stringify(msg));
      setMessages((prev) => [...prev, { ...msg, timestamp: new Date() }]);
      setInput("");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {!username ? (
        <div>
          <h2>Enter Username</h2>
          <input
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
          />
          <button onClick={register}>Join</button>
        </div>
      ) : (
        <div>
          <h2>Welcome {username}</h2>
          <input
            placeholder="Send to (username)"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <div
            style={{
              border: "1px solid gray",
              padding: 10,
              height: 200,
              overflowY: "auto",
              margin: "10px 0",
            }}
          >
            {messages.map((msg, idx) => (
              <div key={idx}>
                <strong>{msg.from}:</strong> {msg.text}
              </div>
            ))}
          </div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}
    </div>
  );
}

export default App;
