
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { nanoid } = require("nanoid"); 

const app = express();
const PORT = 8008;

app.use(cors());
app.use(express.json());

const urlDatabase = {};

async function logEvent(level, message, meta = {}) {
  const logData = {
    level,
    package: "URLShortener",
    message,
    ...meta
  };
  try {
    await axios.post("http://localhost:8009/logs", logData);
  } catch (err) {
    console.error("Failed to log event:", err.message);
  }
}

app.post("/shorten", async (req, res) => {
  const { originalUrl } = req.body;
  if (!originalUrl) {
    await logEvent("warn", "No URL provided to shorten");
    return res.status(400).json({ error: "originalUrl is required" });
  }
  const shortCode = nanoid(7);
  urlDatabase[shortCode] = originalUrl;
  await logEvent("info", "URL shortened", { originalUrl, shortCode });
  res.json({ shortUrl: `http://localhost:${PORT}/${shortCode}` });
});

app.get("/:shortCode", async (req, res) => {
  const { shortCode } = req.params;
  const originalUrl = urlDatabase[shortCode];
  if (originalUrl) {
    await logEvent("info", "Redirected to original URL", { shortCode, originalUrl });
    return res.redirect(originalUrl);
  } else {
    await logEvent("warn", "Short code not found", { shortCode });
    return res.status(404).send("Short URL not found");
  }
});

app.use(async (err, req, res, next) => {
  const logData = {
    stack: err.stack,
    level: "error",
    package: "URLShortener",
    message: err.message
  };
  try {
    await axios.post("http://localhost:8009/logs", logData); 
  } catch (logErr) {
    console.error("Failed to log error:", logErr.message);
  }
  res.status(500).send("An error occurred and was logged.");
});

app.get("/", (req, res) => {
  res.send("URL Shortener Backend is running");
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});