const express = require("express");
const crypto = require("crypto");
const app = express();

app.use(express.static("public"));
app.use(express.json());

let reminders = [];
let users = [
  { username: "admin", password: "certamen123", token: generateToken() },
];

function generateToken() {
  return crypto.randomBytes(48).toString("hex");
}

// Middleware de autenticación
const authenticate = (req, res, next) => {
  const token = req.headers["x-authorization"];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  const user = users.find((u) => u.token === token);
  if (!user) {
    return res.status(401).json({ error: "Invalid token" });
  }
  next();
};

// Ruta de logins
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ error: "User not found" });

  if (user.password === password) {
    user.token = generateToken();
    return res
      .status(200)
      .json({ username: user.username, name: "Admin", token: user.token });
  } else {
    return res.status(401).json({ error: "Invalid password" });
  }
});

// Ruta para listar recordatorios
app.get("/api/reminders", authenticate, (req, res) => {
  const orderedReminders = reminders.sort((a, b) => b.createdAt - a.createdAt);
  res.status(200).json(
    orderedReminders.map((reminder) => ({
      id: reminder.id,
      content: reminder.content,
      important: reminder.important,
      createdAt: reminder.createdAt,
    }))
  );
});

// Ruta para crear un recordatorio
app.post("/api/reminders", authenticate, (req, res) => {
  const { content, important } = req.body;
  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  const newReminder = {
    id: crypto.randomBytes(16).toString("hex"),
    content: content,
    important: important || false,
    createdAt: Date.now(),
  };

  reminders.push(newReminder);
  res.status(201).json(newReminder);
});

// Ruta para actualizar un recordatorio
app.patch("/api/reminders/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const { content, important } = req.body;
  const reminder = reminders.find((r) => r.id === id);

  if (!reminder) return res.status(404).json({ error: "Reminder not found" });

  reminder.content = content || reminder.content;
  reminder.important = important !== undefined ? important : reminder.important;

  res.status(200).json({
    id: reminder.id,
    content: reminder.content,
    important: reminder.important,
    createdAt: reminder.createdAt,
  });
});

// Ruta para borrar un recordatorio
app.delete("/api/reminders/:id", authenticate, (req, res) => {
  const { id } = req.params;
  const index = reminders.findIndex((r) => r.id === id);

  if (index === -1)
    return res.status(404).json({ error: "Reminder not found" });

  reminders.splice(index, 1);
  res.status(204).send();
});

// Ruta de logout (salida)
app.post("/api/auth/logout", authenticate, (req, res) => {
  const token = req.headers["x-authorization"];
  const user = users.find((u) => u.token === token);

  if (user) {
    user.token = null; // Invalidar el token
    res.status(200).json({ message: "Logout successful" });
  } else {
    res.status(401).json({ error: "Invalid token" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
