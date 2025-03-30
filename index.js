const sqlString = require('sqlstring');
const generateCrudRoutes = require('./generateCrudRoutes');

const createDb = (pool, allowedTables = [], options = {}) => {
  const { useTimestamps = true } = options;

  const validateTable = (table) => {
    if (!allowedTables.includes(table)) {
      throw new Error(`Table '${table}' is not allowed.`);
    }
  };

  const db = {
    query: async (sql, params = []) => {
      try {
        const start = Date.now();
        const [rows] = await pool.execute(sql, params);
        const duration = Date.now() - start;
        if (duration > 500) {
          console.warn(`⚠️ Slow query (${duration}ms):`, sql);
        }
        return rows;
      } catch (err) {
        console.error('Query Error:', err);
        throw err;
      }
    },

    getOne: async (sql, params = []) => {
      const rows = await db.query(sql, params);
      return rows[0] || null;
    },

    insert: async (table, data) => {
      validateTable(table);
      const now = new Date();
      const finalData = {
        ...data,
        ...(useTimestamps ? { created_at: now, updated_at: now } : {})
      };
    
      const keys = Object.keys(finalData);
      const values = Object.values(finalData);
      const placeholders = keys.map(() => '?').join(', ');
      const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;
      const [result] = await pool.execute(sql, values);
      return result.insertId;
    },
    

    bulkInsert: async (table, dataArray) => {
      validateTable(table);
      if (!Array.isArray(dataArray) || dataArray.length === 0) return;
      const keys = Object.keys(dataArray[0]);
      const placeholders = dataArray.map(() => `(${keys.map(() => '?').join(', ')})`).join(', ');
      const values = dataArray.flatMap(Object.values);
      const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES ${placeholders}`;
      const [result] = await pool.execute(sql, values);
      return result.affectedRows;
    },

    updateById: async (table, id, data, idField = 'id') => {
      validateTable(table);
      const finalData = {
        ...data,
        ...(useTimestamps ? { updated_at: new Date() } : {})
      };
    
      const keys = Object.keys(finalData);
      const values = Object.values(finalData);
      const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
      const sql = `UPDATE \`${table}\` SET ${setClause} WHERE \`${idField}\` = ?`;
      await pool.execute(sql, [...values, id]);
    },
    

    deleteById: async (table, id, soft = false, idField = 'id') => {
      validateTable(table);
      if (soft) {
        const sql = `UPDATE \`${table}\` SET deleted_at = NOW() WHERE \`${idField}\` = ?`;
        await pool.execute(sql, [id]);
      } else {
        const sql = `DELETE FROM \`${table}\` WHERE \`${idField}\` = ?`;
        await pool.execute(sql, [id]);
      }
    },

    selectWhere: async (table, conditions = {}, options = {}) => {
      validateTable(table);
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      const whereClause = keys.map(k => `\`${k}\` = ?`).join(' AND ');
      const limit = options.limit ? `LIMIT ${options.limit}` : '';
      const offset = options.offset ? `OFFSET ${options.offset}` : '';
      const sql = `SELECT * FROM \`${table}\`${keys.length ? ` WHERE ${whereClause}` : ''} ${limit} ${offset}`.trim();
      return await db.query(sql, values);
    },

    findOne: async (table, conditions = {}) => {
      const result = await db.selectWhere(table, conditions, { limit: 1 });
      return result[0] || null;
    },

    count: async (table, conditions = {}) => {
      validateTable(table);
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      let sql = `SELECT COUNT(*) as count FROM \`${table}\``;
      if (keys.length > 0) {
        const whereClause = keys.map(k => `\`${k}\` = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
      }
      const result = await db.getOne(sql, values);
      return result ? result.count : 0;
    },

    exists: async (table, conditions = {}) => {
      const result = await db.findOne(table, conditions);
      return !!result;
    },

    getByIds: async (table, ids = [], idField = 'id') => {
      validateTable(table);
      if (!Array.isArray(ids) || ids.length === 0) return [];
      const placeholders = ids.map(() => '?').join(', ');
      const sql = `SELECT * FROM \`${table}\` WHERE \`${idField}\` IN (${placeholders})`;
      return await db.query(sql, ids);
    },

    truncate: async (table) => {
      validateTable(table);
      const sql = `TRUNCATE TABLE \`${table}\``;
      return await db.query(sql);
    },

    increment: async (table, id, field, amount = 1, idField = 'id') => {
      validateTable(table);
      const sql = `UPDATE \`${table}\` SET \`${field}\` = \`${field}\` + ? WHERE \`${idField}\` = ?`;
      return await db.query(sql, [amount, id]);
    },

    decrement: async (table, id, field, amount = 1, idField = 'id') => {
      validateTable(table);
      const sql = `UPDATE \`${table}\` SET \`${field}\` = \`${field}\` - ? WHERE \`${idField}\` = ?`;
      return await db.query(sql, [amount, id]);
    },

    distinctValues: async (table, column) => {
      validateTable(table);
      const sql = `SELECT DISTINCT \`${column}\` FROM \`${table}\``;
      return await db.query(sql);
    },

    search: async (table, fields = [], keyword = '') => {
      validateTable(table);
      if (!keyword || !Array.isArray(fields) || fields.length === 0) return [];
      const likeClause = fields.map(f => `\`${f}\` LIKE ?`).join(' OR ');
      const values = fields.map(() => `%${keyword}%`);
      const sql = `SELECT * FROM \`${table}\` WHERE ${likeClause}`;
      return await db.query(sql, values);
    },

    logAudit: async (action, table, data, userId = null) => {
      if (!allowedTables.includes('audit_logs')) return;
      const auditEntry = {
        action,
        table_name: table,
        data: JSON.stringify(data),
        user_id: userId,
        timestamp: new Date(),
      };
      try {
        await db.insert('audit_logs', auditEntry);
      } catch (err) {
        console.warn('Audit logging failed', err);
      }
    },

    transaction: async (callback) => {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
      } catch (err) {
        await connection.rollback();
        console.error('Transaction Error:', err);
        throw err;
      } finally {
        connection.release();
      }
    },

    join: async ({ baseTable, joinTable, baseKey, joinKey, conditions = {}, columns = ['*'], joinType = 'INNER' }) => {
      validateTable(baseTable);
      validateTable(joinTable);
      const selectClause = columns.join(', ');
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      const whereClause = keys.map(k => `\`${baseTable}\`.\`${k}\` = ?`).join(' AND ');
      const sql = `
        SELECT ${selectClause}
        FROM \`${baseTable}\`
        ${joinType} JOIN \`${joinTable}\` ON \`${baseTable}\`.\`${baseKey}\` = \`${joinTable}\`.\`${joinKey}\`
        ${keys.length ? `WHERE ${whereClause}` : ''}
      `.trim();
      return await db.query(sql, values);
    },

    multiJoin: async ({ baseTable, baseAlias = baseTable, joins = [], conditions = {}, columns = ['*'] }) => {
      validateTable(baseTable);
      joins.forEach(j => validateTable(j.table));
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      const whereClause = keys.length
        ? `WHERE ${keys.map(k => `\`${baseAlias}\`.\`${k}\` = ?`).join(' AND ')}`
        : '';

      const joinClauses = joins.map(join => {
        const { table, alias = table, type = 'INNER', baseColumn, joinColumn } = join;
        const joinType = type.toUpperCase();
        if (!['INNER', 'LEFT', 'RIGHT', 'FULL'].includes(joinType)) {
          throw new Error(`Unsupported join type: ${joinType}`);
        }
        if (joinType === 'FULL') return null;
        return `${joinType} JOIN \`${table}\` AS \`${alias}\` ON \`${baseAlias}\`.\`${baseColumn}\` = \`${alias}\`.\`${joinColumn}\``;
      }).filter(Boolean).join('\n');

      const fullJoins = joins.filter(j => j.type?.toUpperCase() === 'FULL');
      if (fullJoins.length) {
        const [fullJoin] = fullJoins;
        const { table, alias = table, baseColumn, joinColumn } = fullJoin;
        const leftJoinQuery = `
          SELECT ${columns.join(', ')}
          FROM \`${baseTable}\` AS \`${baseAlias}\`
          LEFT JOIN \`${table}\` AS \`${alias}\` ON \`${baseAlias}\`.\`${baseColumn}\` = \`${alias}\`.\`${joinColumn}\`
          ${whereClause}
        `;
        const rightJoinQuery = `
          SELECT ${columns.join(', ')}
          FROM \`${table}\` AS \`${alias}\`
          LEFT JOIN \`${baseTable}\` AS \`${baseAlias}\` ON \`${alias}\`.\`${joinColumn}\` = \`${baseAlias}\`.\`${baseColumn}\`
          ${whereClause}
        `;
        const sql = `(${leftJoinQuery}) UNION (${rightJoinQuery})`;
        return await db.query(sql, [...values, ...values]);
      }

      const sql = `
        SELECT ${columns.join(', ')}
        FROM \`${baseTable}\` AS \`${baseAlias}\`
        ${joinClauses}
        ${whereClause}
      `.trim();
      return await db.query(sql, values);
    }
  };

  return db;
};

module.exports = {
  createDb,
  generateCrudRoutes
};