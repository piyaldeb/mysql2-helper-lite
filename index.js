const pool = require('./db'); // or use your app's pool

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

  selectWhere: async (table, conditions = {}) => {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    if (keys.length === 0) return await db.query(`SELECT * FROM ${table}`);
    const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
    const sql = `SELECT * FROM ${table} WHERE ${whereClause}`;
    return await db.query(sql, values);
  }
};

module.exports = db;
