const path = require("path");
const http = require("http");
const express = require("express");
const session = require("express-session");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);

const whitelist = new Set(["alice", "bob", "charlie"]);
const accessTokens = new Set(["invite-123", "invite-456"]);
const alertCode = process.env.ALERT_CODE || "911";

const sessionParser = session({
  secret: "replace-this-with-a-long-random-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "strict"
  }
});

app.use(express.json());
app.use(sessionParser);
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/login", (req, res) => {
  const { username, token } = req.body;
  const safeUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
  const safeToken = typeof token === "string" ? token.trim() : "";

  if (!safeToken || !accessTokens.has(safeToken)) {
    return res.status(401).json({ ok: false, error: "Invalid or missing invite token." });
  }

  if (!safeUsername || !whitelist.has(safeUsername)) {
    return res.status(403).json({ ok: false, error: "Username not whitelisted." });
  }

  req.session.user = {
    username: safeUsername,
    token: safeToken
  };

  return res.json({ ok: true, username: safeUsername });
});

app.get("/session", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ ok: false });
  }
  return res.json({ ok: true, user: req.session.user });
});

const wss = new WebSocketServer({ noServer: true });
const messages = [];

wss.on("connection", (ws, request, user) => {
  ws.send(
    JSON.stringify({
      type: "history",
      messages
    })
  );

  ws.on("message", (data) => {
    let payload;
    try {
      payload = JSON.parse(data.toString());
    } catch (error) {
      return;
    }

    if (payload.type !== "message" || typeof payload.text !== "string") {
      return;
    }

    const text = payload.text.trim();
    if (!text) {
      return;
    }

    if (text === alertCode) {
      const alert = {
        id: Date.now(),
        user: user.username,
        code: alertCode,
        at: new Date().toISOString()
      };
      const outgoing = JSON.stringify({ type: "alert", alert });
      wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(outgoing);
        }
      });
      return;
    }

    const message = {
      id: Date.now(),
      user: user.username,
      text,
      at: new Date().toISOString()
    };

    messages.push(message);
    if (messages.length > 100) {
      messages.shift();
    }

    const outgoing = JSON.stringify({ type: "message", message });
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(outgoing);
      }
    });
  });
});

server.on("upgrade", (request, socket, head) => {
  sessionParser(request, {}, () => {
    const sessionUser = request.session?.user;
    if (!sessionUser || !whitelist.has(sessionUser.username)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, sessionUser);
    });
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Secure chat listening on port ${port}`);
});
