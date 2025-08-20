const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { nanoid } = require("nanoid");

const app = express();
const PORT = 8008;

app.use(cors());
app.use(express.json());

const urlDatabase = {};

async function logEvent(stack,level,package,message) {
  const logData = {
    stack:stack,
    level:level,
    package:package,
    message:message
  };
  try {

await axios.post(
  "http://20.244.56.144/evaluation-service/logs",
  logData,
  {
    headers: {
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiIyMjEyMDc1QGdtaWwuY29tIiwiZXhwIjoxNzU1NjcyNDY1LCJpYXQiOjE3NTU2NzE1NjUsImlzcyI6IkFmZm9yZCBNZWRpY2FsIFRlY2hub2xvZ2llcyBQcml2YXRlIExpbWl0ZWQiLCJqdGkiOiI5OTUxMzdhMi02YTBkLTQ2YjItOGI3OC0xZWQ1YWRhN2U2ZDIiLCJsb2NhbGUiOiJlbi1JTiIsIm5hbWUiOiJoZW1hbGF0aGEgayIsInN1YiI6ImQ3MTFiNTFiLTE5N2EtNDcxNi1iMzc4LTg4YWMwYTY1NDIyYyJ9LCJlbWFpbCI6IjIyMTIwNzVAZ21pbC5jb20iLCJuYW1lIjoiaGVtYWxhdGhhIGsiLCJyb2xsTm8iOiIyMjEyMDc1IiwiYWNjZXNzQ29kZSI6InhzWlRUbiIsImNsaWVudElEIjoiZDcxMWI1MWItMTk3YS00NzE2LWIzNzgtODhhYzBhNjU0MjJjIiwiY2xpZW50U2VjcmV0IjoieHpYZHZxWHlwZ1Z0RGZWRCJ9.ew37XGr0ns2FvkUgM0Y0lAWnEoqPTKTKDE0GdF_sIzU"
    }
  }
);
  } catch (err) {
    console.error("Failed to log event:", err.message);
  }
}

app.post("/shorturls", async (req, res) => {
  const { url, validity, shortcode } = req.body;
  if (!url) {
    await logEvent("backend","warn","service","No URL provided to shorten");
    return res.status(400).json({ error: "url is required" });
  }
  let shortCode = shortcode || nanoid(7);
  if (urlDatabase[shortCode]) {
    await logEvent("backend","warn","service","Shortcode already exists", { shortCode });
    return res.status(409).json({ error: "Shortcode already exists" });
  }
  urlDatabase[shortCode] = {
    originalUrl: url,
    createdAt: Date.now(),
    validity: validity || null 
  };
  await logEvent("backend","info","service","URL shortened", { url, shortCode, validity });
  res.json({ shortUrl: `http://localhost:${PORT}/${shortCode}` });
});

app.get("/shorturls/:shortCode", async (req, res) => {
  const { shortCode } = req.params;
  const entry = urlDatabase[shortCode];
  if (entry) {
    if (entry.validity) {
      const now = Date.now();
      const expiry = entry.createdAt + entry.validity * 60 * 1000;
      if (now > expiry) {
        await logEvent("backend","warn","service","Short URL expired", { shortCode });
        return res.status(410).send("Short URL expired");
      }
    }
    await logEvent("backend","info","service","Redirected to original URL", { shortCode, originalUrl: entry.originalUrl });
    return res.redirect(entry.originalUrl);
  } else {
    await logEvent("backend","warn","service","Short code not found", { shortCode });
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
    await axios.post("http://20.244.56.144/evaluation-service/logs", logData);
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