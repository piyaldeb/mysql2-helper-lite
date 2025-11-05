const sqlString = require('sqlstring');
const generateCrudRoutes = require('./generateCrudRoutes');

const createDb = (pool, allowedTables = [], options = {}) => {
  const { 
    useTimestamps = true,
    enableQueryCache = false,
    cacheExpiry = 60000, // 1 minute
    enableHooks = true,
    defaultPagination = { limit: 50, offset: 0 }
  } = options;

  // Query cache
  const queryCache = new Map();
  const hooks = { before: {}, after: {} };

  const validateTable = (table) => {
    if (!allowedTables.includes(table)) {
      throw new Error(`Table '${table}' is not allowed.`);
    }
  };

  const getCacheKey = (sql, params) => `${sql}:${JSON.stringify(params)}`;

  const clearCacheForTable = (table) => {
    for (const [key] of queryCache) {
      if (key.includes(table)) {
        queryCache.delete(key);
      }
    }
  };

  const runHook = async (type, operation, data) => {
    if (!enableHooks) return data;
    const hook = hooks[type]?.[operation];
    if (hook) return await hook(data);
    return data;
  };

  const db = {
    // Core query method with caching
    query: async (sql, params = [], useCache = false) => {
      const cacheKey = getCacheKey(sql, params);
      
      if (useCache && enableQueryCache && queryCache.has(cacheKey)) {
        const cached = queryCache.get(cacheKey);
        if (Date.now() - cached.timestamp < cacheExpiry) {
          return cached.data;
        }
        queryCache.delete(cacheKey);
      }

      try {
        const start = Date.now();
        const [rows] = await pool.execute(sql, params);
        const duration = Date.now() - start;
        
        if (duration > 500) {
          console.warn(`⚠️ Slow query (${duration}ms):`, sql);
        }

        if (useCache && enableQueryCache) {
          queryCache.set(cacheKey, { data: rows, timestamp: Date.now() });
        }

        return rows;
      } catch (err) {
        console.error('Query Error:', err);
        throw err;
      }
    },

    getOne: async (sql, params = [], useCache = false) => {
      const rows = await db.query(sql, params, useCache);
      return rows[0] || null;
    },

    // Enhanced insert with returning data and hooks
    insert: async (table, data) => {
      validateTable(table);
      let processedData = await runHook('before', 'insert', { table, data });
      
      const now = new Date();
      const finalData = {
        ...processedData.data,
        ...(useTimestamps ? { created_at: now, updated_at: now } : {})
      };
    
      const keys = Object.keys(finalData);
      const values = Object.values(finalData);
      const placeholders = keys.map(() => '?').join(', ');
      const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;
      const [result] = await pool.execute(sql, values);
      
      clearCacheForTable(table);
      await runHook('after', 'insert', { table, id: result.insertId, data: finalData });
      
      return result.insertId;
    },

    // Insert and return the full record
    insertAndReturn: async (table, data, idField = 'id') => {
      const id = await db.insert(table, data);
      return await db.findOne(table, { [idField]: id });
    },

    // Upsert (insert or update if exists)
    upsert: async (table, data, conflictKeys = ['id']) => {
      validateTable(table);
      const now = new Date();
      const finalData = {
        ...data,
        ...(useTimestamps ? { created_at: now, updated_at: now } : {})
      };
    
      const keys = Object.keys(finalData);
      const values = Object.values(finalData);
      const placeholders = keys.map(() => '?').join(', ');
      const updateClause = keys
        .filter(k => !conflictKeys.includes(k))
        .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
        .join(', ');
      
      const sql = `
        INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) 
        VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE ${updateClause}
      `;
      
      const [result] = await pool.execute(sql, values);
      clearCacheForTable(table);
      return result.insertId || result.affectedRows;
    },

    bulkInsert: async (table, dataArray) => {
      validateTable(table);
      if (!Array.isArray(dataArray) || dataArray.length === 0) return;
      const keys = Object.keys(dataArray[0]);
      const placeholders = dataArray.map(() => `(${keys.map(() => '?').join(', ')})`).join(', ');
      const values = dataArray.flatMap(Object.values);
      const sql = `INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES ${placeholders}`;
      const [result] = await pool.execute(sql, values);
      clearCacheForTable(table);
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
      clearCacheForTable(table);
    },

    // Conditional update
    updateWhere: async (table, conditions = {}, data = {}) => {
      validateTable(table);
      const finalData = {
        ...data,
        ...(useTimestamps ? { updated_at: new Date() } : {})
      };
    
      const dataKeys = Object.keys(finalData);
      const dataValues = Object.values(finalData);
      const condKeys = Object.keys(conditions);
      const condValues = Object.values(conditions);
      
      const setClause = dataKeys.map(k => `\`${k}\` = ?`).join(', ');
      const whereClause = condKeys.map(k => `\`${k}\` = ?`).join(' AND ');
      
      const sql = `UPDATE \`${table}\` SET ${setClause} WHERE ${whereClause}`;
      const [result] = await pool.execute(sql, [...dataValues, ...condValues]);
      clearCacheForTable(table);
      return result.affectedRows;
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
      clearCacheForTable(table);
    },

    // Delete with conditions
    deleteWhere: async (table, conditions = {}, soft = false) => {
      validateTable(table);
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      const whereClause = keys.map(k => `\`${k}\` = ?`).join(' AND ');
      
      const sql = soft 
        ? `UPDATE \`${table}\` SET deleted_at = NOW() WHERE ${whereClause}`
        : `DELETE FROM \`${table}\` WHERE ${whereClause}`;
      
      const [result] = await pool.execute(sql, values);
      clearCacheForTable(table);
      return result.affectedRows;
    },

    // Advanced select with complex conditions
    select: async (table, options = {}) => {
      validateTable(table);
      const {
        columns = ['*'],
        where = {},
        whereRaw = '',
        orderBy = [],
        groupBy = [],
        having = '',
        limit = defaultPagination.limit,
        offset = defaultPagination.offset,
        useCache = false
      } = options;

      const selectClause = Array.isArray(columns) ? columns.join(', ') : columns;
      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      
      let sql = `SELECT ${selectClause} FROM \`${table}\``;
      
      if (whereKeys.length > 0) {
        const whereClause = whereKeys.map(k => `\`${k}\` = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
      } else if (whereRaw) {
        sql += ` WHERE ${whereRaw}`;
      }
      
      if (groupBy.length > 0) {
        sql += ` GROUP BY ${groupBy.join(', ')}`;
      }
      
      if (having) {
        sql += ` HAVING ${having}`;
      }
      
      if (orderBy.length > 0) {
        const orderClauses = orderBy.map(o => {
          if (typeof o === 'string') return o;
          return `\`${o.column}\` ${o.direction || 'ASC'}`;
        });
        sql += ` ORDER BY ${orderClauses.join(', ')}`;
      }
      
      if (limit) sql += ` LIMIT ${limit}`;
      if (offset) sql += ` OFFSET ${offset}`;
      
      return await db.query(sql, whereValues, useCache);
    },

    selectWhere: async (table, conditions = {}, options = {}) => {
      validateTable(table);
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      const whereClause = keys.map(k => `\`${k}\` = ?`).join(' AND ');
      const limit = options.limit ? `LIMIT ${options.limit}` : '';
      const offset = options.offset ? `OFFSET ${options.offset}` : '';
      const sql = `SELECT * FROM \`${table}\`${keys.length ? ` WHERE ${whereClause}` : ''} ${limit} ${offset}`.trim();
      return await db.query(sql, values, options.useCache);
    },

    findOne: async (table, conditions = {}) => {
      const result = await db.selectWhere(table, conditions, { limit: 1 });
      return result[0] || null;
    },

    // Paginated results with metadata
    paginate: async (table, options = {}) => {
      const {
        page = 1,
        perPage = 20,
        where = {},
        orderBy = []
      } = options;

      const offset = (page - 1) * perPage;
      const total = await db.count(table, where);
      const data = await db.select(table, {
        where,
        orderBy,
        limit: perPage,
        offset
      });

      return {
        data,
        pagination: {
          total,
          page,
          perPage,
          totalPages: Math.ceil(total / perPage),
          hasNext: page < Math.ceil(total / perPage),
          hasPrev: page > 1
        }
      };
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

    // Batch operations
    batchUpdate: async (table, updates = [], idField = 'id') => {
      validateTable(table);
      if (!Array.isArray(updates) || updates.length === 0) return 0;
      
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        
        for (const update of updates) {
          const { id, ...data } = update;
          const finalData = {
            ...data,
            ...(useTimestamps ? { updated_at: new Date() } : {})
          };
          
          const keys = Object.keys(finalData);
          const values = Object.values(finalData);
          const setClause = keys.map(k => `\`${k}\` = ?`).join(', ');
          const sql = `UPDATE \`${table}\` SET ${setClause} WHERE \`${idField}\` = ?`;
          await connection.execute(sql, [...values, id]);
        }
        
        await connection.commit();
        clearCacheForTable(table);
        return updates.length;
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    },

    truncate: async (table) => {
      validateTable(table);
      const sql = `TRUNCATE TABLE \`${table}\``;
      clearCacheForTable(table);
      return await db.query(sql);
    },

    increment: async (table, id, field, amount = 1, idField = 'id') => {
      validateTable(table);
      const sql = `UPDATE \`${table}\` SET \`${field}\` = \`${field}\` + ? WHERE \`${idField}\` = ?`;
      clearCacheForTable(table);
      return await db.query(sql, [amount, id]);
    },

    decrement: async (table, id, field, amount = 1, idField = 'id') => {
      validateTable(table);
      const sql = `UPDATE \`${table}\` SET \`${field}\` = \`${field}\` - ? WHERE \`${idField}\` = ?`;
      clearCacheForTable(table);
      return await db.query(sql, [amount, id]);
    },

    // Aggregate functions
    aggregate: async (table, options = {}) => {
      validateTable(table);
      const {
        functions = [], // [{ func: 'SUM', column: 'amount', alias: 'total' }]
        groupBy = [],
        where = {},
        having = ''
      } = options;

      const funcClauses = functions.map(f => 
        `${f.func}(\`${f.column}\`) as ${f.alias || f.column}`
      ).join(', ');
      
      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      const whereClause = whereKeys.length > 0 
        ? `WHERE ${whereKeys.map(k => `\`${k}\` = ?`).join(' AND ')}`
        : '';
      
      const groupClause = groupBy.length > 0 
        ? `GROUP BY ${groupBy.map(g => `\`${g}\``).join(', ')}`
        : '';
      
      const havingClause = having ? `HAVING ${having}` : '';
      
      const sql = `
        SELECT ${groupBy.map(g => `\`${g}\``).join(', ')}${groupBy.length > 0 ? ', ' : ''}${funcClauses}
        FROM \`${table}\`
        ${whereClause}
        ${groupClause}
        ${havingClause}
      `.trim();
      
      return await db.query(sql, whereValues);
    },

    // Get min/max/avg/sum
    min: async (table, column, where = {}) => {
      const result = await db.aggregate(table, {
        functions: [{ func: 'MIN', column, alias: 'min_value' }],
        where
      });
      return result[0]?.min_value || null;
    },

    max: async (table, column, where = {}) => {
      const result = await db.aggregate(table, {
        functions: [{ func: 'MAX', column, alias: 'max_value' }],
        where
      });
      return result[0]?.max_value || null;
    },

    avg: async (table, column, where = {}) => {
      const result = await db.aggregate(table, {
        functions: [{ func: 'AVG', column, alias: 'avg_value' }],
        where
      });
      return result[0]?.avg_value || null;
    },

    sum: async (table, column, where = {}) => {
      const result = await db.aggregate(table, {
        functions: [{ func: 'SUM', column, alias: 'sum_value' }],
        where
      });
      return result[0]?.sum_value || null;
    },

    distinctValues: async (table, column) => {
      validateTable(table);
      const sql = `SELECT DISTINCT \`${column}\` FROM \`${table}\``;
      return await db.query(sql);
    },

    // Advanced search with multiple operators
    advancedSearch: async (table, criteria = {}, options = {}) => {
      validateTable(table);
      const { 
        limit = 100, 
        offset = 0, 
        orderBy = [] 
      } = options;

      const conditions = [];
      const values = [];

      Object.entries(criteria).forEach(([field, condition]) => {
        if (typeof condition === 'object' && condition !== null) {
          const { operator = '=', value } = condition;
          
          switch (operator.toUpperCase()) {
            case 'LIKE':
              conditions.push(`\`${field}\` LIKE ?`);
              values.push(`%${value}%`);
              break;
            case 'IN':
              const placeholders = Array.isArray(value) 
                ? value.map(() => '?').join(', ')
                : '?';
              conditions.push(`\`${field}\` IN (${placeholders})`);
              values.push(...(Array.isArray(value) ? value : [value]));
              break;
            case 'BETWEEN':
              conditions.push(`\`${field}\` BETWEEN ? AND ?`);
              values.push(value.min, value.max);
              break;
            case 'IS NULL':
              conditions.push(`\`${field}\` IS NULL`);
              break;
            case 'IS NOT NULL':
              conditions.push(`\`${field}\` IS NOT NULL`);
              break;
            default:
              conditions.push(`\`${field}\` ${operator} ?`);
              values.push(value);
          }
        } else {
          conditions.push(`\`${field}\` = ?`);
          values.push(condition);
        }
      });

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}`
        : '';
      
      const orderClause = orderBy.length > 0
        ? `ORDER BY ${orderBy.map(o => `\`${o.column}\` ${o.direction || 'ASC'}`).join(', ')}`
        : '';

      const sql = `
        SELECT * FROM \`${table}\`
        ${whereClause}
        ${orderClause}
        LIMIT ${limit} OFFSET ${offset}
      `.trim();

      return await db.query(sql, values);
    },

    search: async (table, fields = [], keyword = '') => {
      validateTable(table);
      if (!keyword || !Array.isArray(fields) || fields.length === 0) return [];
      const likeClause = fields.map(f => `\`${f}\` LIKE ?`).join(' OR ');
      const values = fields.map(() => `%${keyword}%`);
      const sql = `SELECT * FROM \`${table}\` WHERE ${likeClause}`;
      return await db.query(sql, values);
    },

    // Full-text search (requires FULLTEXT index)
    fullTextSearch: async (table, columns = [], searchTerm = '', options = {}) => {
      validateTable(table);
      const { 
        mode = 'NATURAL LANGUAGE',
        limit = 100,
        minScore = 0
      } = options;

      const columnsStr = columns.map(c => `\`${c}\``).join(', ');
      const sql = `
        SELECT *, MATCH(${columnsStr}) AGAINST(? IN ${mode} MODE) as relevance
        FROM \`${table}\`
        WHERE MATCH(${columnsStr}) AGAINST(? IN ${mode} MODE)
        ${minScore > 0 ? `AND MATCH(${columnsStr}) AGAINST(? IN ${mode} MODE) > ${minScore}` : ''}
        ORDER BY relevance DESC
        LIMIT ${limit}
      `;
      
      const params = minScore > 0 
        ? [searchTerm, searchTerm, searchTerm]
        : [searchTerm, searchTerm];
      
      return await db.query(sql, params);
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
    },

    // Hooks management
    addHook: (type, operation, callback) => {
      if (!['before', 'after'].includes(type)) {
        throw new Error('Hook type must be "before" or "after"');
      }
      if (!hooks[type]) hooks[type] = {};
      hooks[type][operation] = callback;
    },

    removeHook: (type, operation) => {
      if (hooks[type]?.[operation]) {
        delete hooks[type][operation];
      }
    },

    // Cache management
    clearCache: (table = null) => {
      if (table) {
        clearCacheForTable(table);
      } else {
        queryCache.clear();
      }
    },

    getCacheStats: () => ({
      size: queryCache.size,
      enabled: enableQueryCache,
      expiry: cacheExpiry
    }),

    // Database utilities
    getTableSchema: async (table) => {
      validateTable(table);
      const sql = `DESCRIBE \`${table}\``;
      return await db.query(sql);
    },

    getTableIndexes: async (table) => {
      validateTable(table);
      const sql = `SHOW INDEX FROM \`${table}\``;
      return await db.query(sql);
    },

    // Raw SQL with validation
    raw: async (sql, params = []) => {
      // Basic SQL injection prevention
      const dangerousKeywords = ['DROP', 'TRUNCATE', 'DELETE', 'ALTER', 'CREATE'];
      const upperSql = sql.toUpperCase();
      
      for (const keyword of dangerousKeywords) {
        if (upperSql.includes(keyword)) {
          throw new Error(`Dangerous SQL keyword detected: ${keyword}`);
        }
      }
      
      return await db.query(sql, params);
    },

    // Health check
    healthCheck: async () => {
      try {
        await db.query('SELECT 1');
        return { status: 'healthy', timestamp: new Date() };
      } catch (err) {
        return { status: 'unhealthy', error: err.message, timestamp: new Date() };
      }
    }
  };

  return db;
};

module.exports = {
  createDb,
  generateCrudRoutes
};