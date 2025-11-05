module.exports = function generateCrudRoutes(app, table, db) {
    const base = `/${table}`;
  
    // Get all
    app.get(base, async (req, res) => {
      try {
        const data = await db.selectWhere(table, req.query);
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  
    // Get by ID
    app.get(`${base}/:id`, async (req, res) => {
      try {
        const data = await db.findOne(table, { id: req.params.id });
        if (!data) return res.status(404).json({ error: 'Not found' });
        res.json(data);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  
    // Create
    app.post(base, async (req, res) => {
      try {
        const id = await db.insert(table, req.body);
        res.status(201).json({ id });
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    });
  
    // Update
    app.put(`${base}/:id`, async (req, res) => {
      try {
        await db.updateById(table, req.params.id, req.body);
        res.json({ success: true });
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    });
  
    // Delete (soft)
    app.delete(`${base}/:id`, async (req, res) => {
      try {
        await db.deleteById(table, req.params.id, true);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  };
  