module.exports = function(pool) {
  const db = {
    query: async (sql, params = []) => {
      const [rows] = await pool.execute(sql, params);
      return rows;
    },

    getOne: async (sql, params = []) => {
      const [rows] = await pool.execute(sql, params);
      return rows[0] || null;
    },

    insert: async (table, data) => {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
      const [result] = await pool.execute(sql, values);
      return result.insertId;
    },

    updateById: async (table, id, data, idField = 'id') => {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map(k => `${k} = ?`).join(', ');
      const sql = `UPDATE ${table} SET ${setClause} WHERE ${idField} = ?`;
      await pool.execute(sql, [...values, id]);
    },

    deleteById: async (table, id, idField = 'id') => {
      const sql = `DELETE FROM ${table} WHERE ${idField} = ?`;
      await pool.execute(sql, [id]);
    },

    forceDeleteById: async (table, id, idField = 'id') => {
      const sql = `DELETE FROM ${table} WHERE ${idField} = ?`;
      await pool.execute(sql, [id]);
    },

    selectWhere: async (table, conditions = {}) => {
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      if (keys.length === 0) return await db.query(`SELECT * FROM ${table}`);
      const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
      const sql = `SELECT * FROM ${table} WHERE ${whereClause}`;
      return await db.query(sql, values);
    },

    findOne: async (table, conditions = {}) => {
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      if (keys.length === 0) return null;
      const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
      const sql = `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`;
      return await db.getOne(sql, values);
    },

    count: async (table, conditions = {}) => {
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      let sql = `SELECT COUNT(*) as count FROM ${table}`;
      if (keys.length > 0) {
        const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
      }
      const result = await db.getOne(sql, values);
      return result ? result.count : 0;
    },

    exists: async (table, conditions = {}) => {
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      if (keys.length === 0) return false;
      const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
      const sql = `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${whereClause}) AS exist`;
      const result = await db.getOne(sql, values);
      return !!result?.exist;
    }
  };

  return db;
};
