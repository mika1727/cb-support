const router    = require("express").Router();
const { getDB } = require("../db/database");

router.get("/", (req, res) => {
  try {
    const from = req.query.from || new Date(Date.now()-7*86400000).toISOString();
    const to   = req.query.to   || new Date().toISOString();
    const data = getDB().getAnalytics(from, to);
    res.json({ period:{ from, to }, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
