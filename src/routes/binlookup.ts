<<<<<<< HEAD
// routes/binlookup.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/:bin", async (req, res) => {
  const { bin } = req.params;

  try {
    const response = await fetch(`https://lookup.binlist.net/${bin}`, {
      headers: { "Accept": "application/json" } // 👈 obligatorio
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "BIN no válido" });
    }

    const data = await response.json();
    res.json(data); // 🔥 ahora sí tu backend responde bien
  } catch (err) {
    console.error("Error consultando BIN:", err);
    res.status(500).json({ error: "Error al consultar el BIN" });
  }
});

export default router;
=======
// routes/binlookup.js
import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/:bin", async (req, res) => {
  const { bin } = req.params;

  try {
    const response = await fetch(`https://lookup.binlist.net/${bin}`, {
      headers: { "Accept": "application/json" } // 👈 obligatorio
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "BIN no válido" });
    }

    const data = await response.json();
    res.json(data); // 🔥 ahora sí tu backend responde bien
  } catch (err) {
    console.error("Error consultando BIN:", err);
    res.status(500).json({ error: "Error al consultar el BIN" });
  }
});

export default router;
>>>>>>> 5fb615d (A)
