// server.js
require("dotenv").config();
const WebSocket = require("ws");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGO_URI;

// ✅ MongoDB connection
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch((err) => console.error("❌ MongoDB error:", err));

// ✅ Schema
const messageSchema = new mongoose.Schema({
  from: String,
  to: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// ✅ User connections map
const users = new Map(); // { username: ws }

const wss = new WebSocket.Server({ port: PORT });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data);

      // When client requests history
      if (msg.type === "history") {
        const { from, to } = msg;

        const history = await Message.find({
          $or: [
            { from, to },
            { from: to, to: from }
          ]
        }).sort({ timestamp: 1 });

        ws.send(
          JSON.stringify({ type: "history", data: history })
        );
      }

      // When client sends private message
      if (msg.type === "private") {
        const { from, to, text } = msg;

        const newMsg = new Message({ from, to, text });
        await newMsg.save();

        // Send back to sender
        ws.send(
          JSON.stringify({ type: "private", from, to, text })
        );

        // Send to recipient
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({ type: "private", from, to, text })
            );
          }
        });
      }
    } catch (err) {
      console.error("Error handling message:", err);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });


  ws.on("close", () => {
    if (ws.username) {
      users.delete(ws.username);
      console.log(`❌ ${ws.username} disconnected`);
    }
  });
});

console.log(`✅ WebSocket P2P server running on ws://localhost:${PORT}`);
