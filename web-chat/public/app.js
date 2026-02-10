const loginPanel = document.getElementById("login-panel");
const chatPanel = document.getElementById("chat-panel");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const tokenField = document.getElementById("token-field");
const statusBadge = document.getElementById("status");
const chatWindow = document.getElementById("chat-window");
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const userPill = document.getElementById("user-pill");

const urlParams = new URLSearchParams(window.location.search);
const inviteToken = urlParams.get("token") || "";

tokenField.value = inviteToken;

let socket = null;
let currentUser = null;
let alertBanner = null;

const setStatus = (text, connected = false) => {
  statusBadge.textContent = text;
  statusBadge.classList.toggle("connected", connected);
};

const appendMessage = (message) => {
  const wrapper = document.createElement("div");
  wrapper.className = "message";
  wrapper.innerHTML = `
    <div class="meta">
      <span class="user">${message.user}</span>
      <span class="time">${new Date(message.at).toLocaleTimeString()}</span>
    </div>
    <div class="text"></div>
  `;
  wrapper.querySelector(".text").textContent = message.text;
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;
};

const appendSystemNotice = (notice) => {
  const wrapper = document.createElement("div");
  wrapper.className = "system-message";
  wrapper.textContent = `${notice.user} joined at ${new Date(notice.at).toLocaleTimeString()}.`;
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;
};

const showAlert = (alert) => {
  if (!alertBanner) {
    alertBanner = document.createElement("div");
    alertBanner.className = "alert-banner";
    chatPanel.prepend(alertBanner);
  }

  alertBanner.innerHTML = `
    <strong>Alert triggered</strong>
    <span>${alert.user} entered code ${alert.code} at ${new Date(alert.at).toLocaleTimeString()}.</span>
  `;

  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.2;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      context.close();
    }, 400);
  } catch (error) {
    // Audio playback can fail if user gesture is required.
  }
};

const connectSocket = () => {
  setStatus("Connecting...", false);
  socket = new WebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`);

  socket.addEventListener("open", () => {
    setStatus("Connected", true);
  });

  socket.addEventListener("close", () => {
    setStatus("Disconnected", false);
  });

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "history") {
      chatWindow.innerHTML = "";
      data.messages.forEach(appendMessage);
    }
    if (data.type === "message") {
      appendMessage(data.message);
    }
    if (data.type === "alert") {
      showAlert(data.alert);
    }
    if (data.type === "join") {
      appendSystemNotice(data.notice);
    }
  });
};

const showChat = (user) => {
  currentUser = user;
  userPill.textContent = `Logged in as ${user.username}`;
  loginPanel.classList.add("hidden");
  chatPanel.classList.remove("hidden");
  connectSocket();
};

const checkSession = async () => {
  const response = await fetch("/session");
  if (response.ok) {
    const data = await response.json();
    showChat(data.user);
  }
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  const formData = new FormData(loginForm);
  const payload = {
    username: formData.get("username"),
    token: inviteToken
  };

  const response = await fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  if (!response.ok) {
    loginError.textContent = result.error || "Login failed.";
    return;
  }

  showChat({ username: result.username });
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  const text = messageInput.value.trim();
  if (!text) {
    return;
  }

  socket.send(JSON.stringify({ type: "message", text }));
  messageInput.value = "";
});

if (!inviteToken) {
  loginError.textContent = "Missing invite token. Use the invite URL to access this room.";
}

checkSession();
