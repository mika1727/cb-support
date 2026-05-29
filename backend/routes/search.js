const router    = require("express").Router();
const { getDB } = require("../db/database");

router.get("/", (req, res) => {
  try {
    const q        = (req.query.q || "").toLowerCase().trim();
    const category = req.query.category || null;
    const limit    = Math.min(parseInt(req.query.limit)||5, 20);
    if (!q) return res.status(400).json({ error:"q is required" });

    const results = getDB().searchKB(q, category, limit);
    if (results.length) getDB().incrementKBHits(results.map(r=>r.id));
    res.json({ results });
  } catch (err) {
    console.error("[search]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
