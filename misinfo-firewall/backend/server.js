const express = require("express");
const cors = require("cors");
const { checkMessage } = require("./index");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/", checkMessage);
app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));