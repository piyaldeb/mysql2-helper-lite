const sqlString = require('sqlstring');
const generateCrudRoutes = require('./generateCrudRoutes');

const createDb = (pool, allowedTables = [], options = {}) => {
  const { 
    useTimestamps = true,              // automatically add created_at / updated_at
    enableQueryCache = false,          // toggle in-memory caching of queries
    cacheExpiry = 60000,               // cache duration (ms)
    enableHooks = true,                // enable before/after hooks
    defaultPagination = { limit: 50, offset: 0 } // default pagination settings
  } = {
    ...options // allow user overrides
  };


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

    insertAndReturn: async (table, data, idField = 'id') => {
      const id = await db.insert(table, data);
      return await db.findOne(table, { [idField]: id });
    },

    bulkInsertAndReturn: async (table, dataArray, idField = 'id') => {
      validateTable(table);
      if (!Array.isArray(dataArray) || dataArray.length === 0) return [];
      
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const insertedIds = [];
        
        for (const data of dataArray) {
          const id = await db.insert(table, data);
          insertedIds.push(id);
        }
        
        await connection.commit();
        return await db.getByIds(table, insertedIds, idField);
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    },

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

    bulkUpsert: async (table, dataArray, conflictKeys = ['id']) => {
      validateTable(table);
      if (!Array.isArray(dataArray) || dataArray.length === 0) return 0;
      
      const keys = Object.keys(dataArray[0]);
      const placeholders = dataArray.map(() => `(${keys.map(() => '?').join(', ')})`).join(', ');
      const values = dataArray.flatMap(Object.values);
      const updateClause = keys
        .filter(k => !conflictKeys.includes(k))
        .map(k => `\`${k}\` = VALUES(\`${k}\`)`)
        .join(', ');
      
      const sql = `
        INSERT INTO \`${table}\` (${keys.map(k => `\`${k}\``).join(', ')})
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE ${updateClause}
      `;
      
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

    updateByIdAndReturn: async (table, id, data, idField = 'id') => {
      await db.updateById(table, id, data, idField);
      return await db.findOne(table, { [idField]: id });
    },

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

    restore: async (table, id, idField = 'id') => {
      validateTable(table);
      const sql = `UPDATE \`${table}\` SET deleted_at = NULL WHERE \`${idField}\` = ?`;
      await pool.execute(sql, [id]);
      clearCacheForTable(table);
    },

    restoreWhere: async (table, conditions = {}) => {
      validateTable(table);
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      const whereClause = keys.map(k => `\`${k}\` = ?`).join(' AND ');
      const sql = `UPDATE \`${table}\` SET deleted_at = NULL WHERE ${whereClause}`;
      const [result] = await pool.execute(sql, values);
      clearCacheForTable(table);
      return result.affectedRows;
    },

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

    findOrCreate: async (table, conditions = {}, defaults = {}) => {
      const existing = await db.findOne(table, conditions);
      if (existing) {
        return { record: existing, created: false };
      }
      
      const data = { ...conditions, ...defaults };
      const id = await db.insert(table, data);
      const record = await db.findOne(table, { id });
      return { record, created: true };
    },

    findOneAndUpdate: async (table, conditions = {}, data = {}) => {
      const existing = await db.findOne(table, conditions);
      if (!existing) return null;
      
      await db.updateById(table, existing.id, data);
      return await db.findOne(table, { id: existing.id });
    },

    findOneAndDelete: async (table, conditions = {}, soft = false) => {
      const existing = await db.findOne(table, conditions);
      if (!existing) return null;
      
      await db.deleteById(table, existing.id, soft);
      return existing;
    },

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

    cursorPaginate: async (table, options = {}) => {
      validateTable(table);
      const {
        cursor = null,
        limit = 20,
        cursorColumn = 'id',
        direction = 'ASC',
        where = {}
      } = options;

      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      
      let sql = `SELECT * FROM \`${table}\``;
      let params = [];
      
      const conditions = [];
      if (whereKeys.length > 0) {
        conditions.push(...whereKeys.map(k => `\`${k}\` = ?`));
        params.push(...whereValues);
      }
      
      if (cursor) {
        const operator = direction === 'ASC' ? '>' : '<';
        conditions.push(`\`${cursorColumn}\` ${operator} ?`);
        params.push(cursor);
      }
      
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      sql += ` ORDER BY \`${cursorColumn}\` ${direction} LIMIT ${limit + 1}`;
      
      const results = await db.query(sql, params);
      const hasMore = results.length > limit;
      const data = hasMore ? results.slice(0, limit) : results;
      const nextCursor = hasMore && data.length > 0 ? data[data.length - 1][cursorColumn] : null;
      
      return {
        data,
        nextCursor,
        hasMore
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

    countBy: async (table, column, where = {}) => {
      validateTable(table);
      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      
      let sql = `SELECT \`${column}\`, COUNT(*) as count FROM \`${table}\``;
      
      if (whereKeys.length > 0) {
        const whereClause = whereKeys.map(k => `\`${k}\` = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
      }
      
      sql += ` GROUP BY \`${column}\``;
      
      return await db.query(sql, whereValues);
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

    first: async (table, orderBy = 'id', direction = 'ASC') => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` ORDER BY \`${orderBy}\` ${direction} LIMIT 1`;
      return await db.getOne(sql);
    },

    last: async (table, orderBy = 'id', direction = 'DESC') => {
      return await db.first(table, orderBy, direction);
    },

    random: async (table, count = 1) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` ORDER BY RAND() LIMIT ${count}`;
      const results = await db.query(sql);
      return count === 1 ? (results[0] || null) : results;
    },

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

    batchDelete: async (table, ids = [], soft = false, idField = 'id') => {
      validateTable(table);
      if (!Array.isArray(ids) || ids.length === 0) return 0;
      
      const placeholders = ids.map(() => '?').join(', ');
      const sql = soft
        ? `UPDATE \`${table}\` SET deleted_at = NOW() WHERE \`${idField}\` IN (${placeholders})`
        : `DELETE FROM \`${table}\` WHERE \`${idField}\` IN (${placeholders})`;
      
      const [result] = await pool.execute(sql, ids);
      clearCacheForTable(table);
      return result.affectedRows;
    },

    truncate: async (table) => {
      validateTable(table);
      await db.query('SET FOREIGN_KEY_CHECKS = 0');
      await db.query(`TRUNCATE TABLE \`${table}\``);
      await db.query('SET FOREIGN_KEY_CHECKS = 1');
      clearCacheForTable(table);
      return true;
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

    incrementMany: async (table, id, fields = {}, idField = 'id') => {
      validateTable(table);
      const setClauses = Object.keys(fields).map(field => 
        `\`${field}\` = \`${field}\` + ?`
      );
      const values = Object.values(fields);
      const sql = `UPDATE \`${table}\` SET ${setClauses.join(', ')} WHERE \`${idField}\` = ?`;
      clearCacheForTable(table);
      return await db.query(sql, [...values, id]);
    },

    decrementMany: async (table, id, fields = {}, idField = 'id') => {
      validateTable(table);
      const setClauses = Object.keys(fields).map(field => 
        `\`${field}\` = \`${field}\` - ?`
      );
      const values = Object.values(fields);
      const sql = `UPDATE \`${table}\` SET ${setClauses.join(', ')} WHERE \`${idField}\` = ?`;
      clearCacheForTable(table);
      return await db.query(sql, [...values, id]);
    },

    aggregate: async (table, options = {}) => {
      validateTable(table);
      const {
        functions = [],
        groupBy = [],
        where = {},
        having = ''
      } = options;

      const funcClauses = functions.map(f => {
      const col = f.column === '*' ? '*' : `\`${f.column}\``;
      return `${f.func}(${col}) as ${f.alias || f.column}`;
    }).join(', ');

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
  return result.length ? Number(result[0].avg_value) : 0;
},

sum: async (table, column, where = {}) => {
  const result = await db.aggregate(table, {
    functions: [{ func: 'SUM', column, alias: 'sum_value' }],
    where
  });
  return result.length ? Number(result[0].sum_value) : 0;
},


    distinctValues: async (table, column) => {
      validateTable(table);
      const sql = `SELECT DISTINCT \`${column}\` FROM \`${table}\``;
      return await db.query(sql);
    },

    pluck: async (table, column, where = {}) => {
      validateTable(table);
      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      
      let sql = `SELECT \`${column}\` FROM \`${table}\``;
      
      if (whereKeys.length > 0) {
        const whereClause = whereKeys.map(k => `\`${k}\` = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
      }
      
      const results = await db.query(sql, whereValues);
      return results.map(row => row[column]);
    },

    chunk: async (table, chunkSize = 100, callback, where = {}) => {
      validateTable(table);
      let offset = 0;
      let hasMore = true;
      
      while (hasMore) {
        const results = await db.selectWhere(table, where, { limit: chunkSize, offset });
        
        if (results.length === 0) {
          hasMore = false;
          break;
        }
        
        await callback(results, offset / chunkSize);
        
        if (results.length < chunkSize) {
          hasMore = false;
        } else {
          offset += chunkSize;
        }
      }
    },

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

    clone: async (table, id, overrides = {}, idField = 'id') => {
      const original = await db.findOne(table, { [idField]: id });
      if (!original) throw new Error('Record not found');
      
      const { [idField]: _, created_at, updated_at, ...data } = original;
      const newData = { ...data, ...overrides };
      
      return await db.insertAndReturn(table, newData, idField);
    },

    isDuplicate: async (table, fields = {}, excludeId = null, idField = 'id') => {
      validateTable(table);
      const keys = Object.keys(fields);
      const values = Object.values(fields);
      
      let conditions = keys.map(k => `\`${k}\` = ?`);
      let params = [...values];
      
      if (excludeId) {
        conditions.push(`\`${idField}\` != ?`);
        params.push(excludeId);
      }
      
      const sql = `SELECT COUNT(*) as count FROM \`${table}\` WHERE ${conditions.join(' AND ')}`;
      const result = await db.getOne(sql, params);
      return result.count > 0;
    },

    withTrashed: async (table, conditions = {}, options = {}) => {
      return await db.selectWhere(table, conditions, options);
    },

    onlyTrashed: async (table, conditions = {}, options = {}) => {
      validateTable(table);
      const keys = Object.keys(conditions);
      const values = Object.values(conditions);
      
      const whereClauses = keys.map(k => `\`${k}\` = ?`);
      whereClauses.push('deleted_at IS NOT NULL');
      
      const limit = options.limit ? `LIMIT ${options.limit}` : '';
      const offset = options.offset ? `OFFSET ${options.offset}` : '';
      const sql = `SELECT * FROM \`${table}\` WHERE ${whereClauses.join(' AND ')} ${limit} ${offset}`.trim();
      
      return await db.query(sql, values);
    },

    jsonExtract: async (table, jsonColumn, path, where = {}) => {
      validateTable(table);
      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      
      let sql = `SELECT id, JSON_EXTRACT(\`${jsonColumn}\`, '${path}') as extracted_value FROM \`${table}\``;
      
      if (whereKeys.length > 0) {
        const whereClause = whereKeys.map(k => `\`${k}\` = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
      }
      
      return await db.query(sql, whereValues);
    },

    jsonContains: async (table, jsonColumn, value, where = {}) => {
      validateTable(table);
      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      const jsonValue = JSON.stringify(value);
      
      let sql = `SELECT * FROM \`${table}\` WHERE JSON_CONTAINS(\`${jsonColumn}\`, ?)`;
      let params = [jsonValue];
      
      if (whereKeys.length > 0) {
        const whereClause = whereKeys.map(k => `\`${k}\` = ?`).join(' AND ');
        sql += ` AND ${whereClause}`;
        params.push(...whereValues);
      }
      
      return await db.query(sql, params);
    },

    whereDateBetween: async (table, dateColumn, startDate, endDate, options = {}) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE \`${dateColumn}\` BETWEEN ? AND ?`;
      return await db.query(sql, [startDate, endDate]);
    },

    whereDate: async (table, dateColumn, date, operator = '=') => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE DATE(\`${dateColumn}\`) ${operator} ?`;
      return await db.query(sql, [date]);
    },

    whereYear: async (table, dateColumn, year) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE YEAR(\`${dateColumn}\`) = ?`;
      return await db.query(sql, [year]);
    },

    whereMonth: async (table, dateColumn, month) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE MONTH(\`${dateColumn}\`) = ?`;
      return await db.query(sql, [month]);
    },

    whereDay: async (table, dateColumn, day) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE DAY(\`${dateColumn}\`) = ?`;
      return await db.query(sql, [day]);
    },

    createdToday: async (table, dateColumn = 'created_at') => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE DATE(\`${dateColumn}\`) = CURDATE()`;
      return await db.query(sql);
    },

    createdThisWeek: async (table, dateColumn = 'created_at') => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE YEARWEEK(\`${dateColumn}\`, 1) = YEARWEEK(CURDATE(), 1)`;
      return await db.query(sql);
    },

    createdThisMonth: async (table, dateColumn = 'created_at') => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE YEAR(\`${dateColumn}\`) = YEAR(CURDATE()) AND MONTH(\`${dateColumn}\`) = MONTH(CURDATE())`;
      return await db.query(sql);
    },

    createdThisYear: async (table, dateColumn = 'created_at') => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE YEAR(\`${dateColumn}\`) = YEAR(CURDATE())`;
      return await db.query(sql);
    },

    median: async (table, column, where = {}) => {
    validateTable(table);
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    
    const whereClause = whereKeys.length > 0
      ? `WHERE ${whereKeys.map(k => `\`${k}\` = ?`).join(' AND ')}`
      : '';
    
    let sql = `
      SELECT AVG(t.${column}) as median_value
      FROM (
        SELECT @rownum:=@rownum+1 as row_number, d.${column}
        FROM \`${table}\` d, (SELECT @rownum:=0) r
        ${whereClause}
        ORDER BY d.${column}
      ) as t
      WHERE t.row_number IN (FLOOR((@rownum+1)/2), FLOOR((@rownum+2)/2))
    `;

    const result = await db.getOne(sql, whereValues);
    return result ? Number(result.median_value) : 0;
  },

    percentile: async (table, column, percentile = 50, where = {}) => {
      validateTable(table);
      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      
      const totalResult = await db.count(table, where);
      const position = Math.ceil((percentile / 100) * totalResult);
      
      let sql = `
        SELECT \`${column}\` FROM \`${table}\`
        ${whereKeys.length > 0 ? `WHERE ${whereKeys.map(k => `\`${k}\` = ?`).join(' AND ')}` : ''}
        ORDER BY \`${column}\`
        LIMIT 1 OFFSET ${position - 1}
      `;
      
      const result = await db.getOne(sql, whereValues);
      return result?.[column] || null;
    },

    groupConcat: async (table, column, groupBy, where = {}, separator = ',') => {
      validateTable(table);
      const whereKeys = Object.keys(where);
      const whereValues = Object.values(where);
      
      let sql = `
        SELECT \`${groupBy}\`, GROUP_CONCAT(\`${column}\` SEPARATOR '${separator}') as concatenated
        FROM \`${table}\`
        ${whereKeys.length > 0 ? `WHERE ${whereKeys.map(k => `\`${k}\` = ?`).join(' AND ')}` : ''}
        GROUP BY \`${groupBy}\`
      `;
      
      return await db.query(sql, whereValues);
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

    hasOne: async (parentTable, childTable, parentId, foreignKey = 'parent_id', columns = ['*']) => {
      validateTable(parentTable);
      validateTable(childTable);
      const sql = `SELECT ${columns.join(', ')} FROM \`${childTable}\` WHERE \`${foreignKey}\` = ? LIMIT 1`;
      return await db.getOne(sql, [parentId]);
    },

    hasMany: async (parentTable, childTable, parentId, foreignKey = 'parent_id', columns = ['*']) => {
      validateTable(parentTable);
      validateTable(childTable);
      const sql = `SELECT ${columns.join(', ')} FROM \`${childTable}\` WHERE \`${foreignKey}\` = ?`;
      return await db.query(sql, [parentId]);
    },

    belongsTo: async (childTable, parentTable, foreignKeyValue, foreignKey = 'parent_id', columns = ['*']) => {
      validateTable(childTable);
      validateTable(parentTable);
      const sql = `SELECT ${columns.join(', ')} FROM \`${parentTable}\` WHERE id = ?`;
      return await db.getOne(sql, [foreignKeyValue]);
    },

    belongsToMany: async (table1, table2, pivotTable, id, columns = ['*']) => {
      validateTable(table1);
      validateTable(table2);
      validateTable(pivotTable);
      
      const sql = `
        SELECT ${columns.map(c => `\`${table2}\`.\`${c}\``).join(', ')}
        FROM \`${table2}\`
        INNER JOIN \`${pivotTable}\` ON \`${table2}\`.id = \`${pivotTable}\`.\`${table2}_id\`
        WHERE \`${pivotTable}\`.\`${table1}_id\` = ?
      `;
      return await db.query(sql, [id]);
    },

    whereIn: async (table, column, values = []) => {
      validateTable(table);
      if (!Array.isArray(values) || values.length === 0) return [];
      const placeholders = values.map(() => '?').join(', ');
      const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` IN (${placeholders})`;
      return await db.query(sql, values);
    },

    whereNotIn: async (table, column, values = []) => {
      validateTable(table);
      if (!Array.isArray(values) || values.length === 0) return [];
      const placeholders = values.map(() => '?').join(', ');
      const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` NOT IN (${placeholders})`;
      return await db.query(sql, values);
    },

    whereBetween: async (table, column, min, max) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` BETWEEN ? AND ?`;
      return await db.query(sql, [min, max]);
    },

    whereNotBetween: async (table, column, min, max) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` NOT BETWEEN ? AND ?`;
      return await db.query(sql, [min, max]);
    },

    whereNull: async (table, column) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` IS NULL`;
      return await db.query(sql);
    },

    whereNotNull: async (table, column) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` IS NOT NULL`;
      return await db.query(sql);
    },

    whereGreaterThan: async (table, column, value) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` > ?`;
      return await db.query(sql, [value]);
    },

    whereLessThan: async (table, column, value) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` < ?`;
      return await db.query(sql, [value]);
    },

    whereStartsWith: async (table, column, value) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` LIKE ?`;
      return await db.query(sql, [`${value}%`]);
    },

    whereEndsWith: async (table, column, value) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` LIKE ?`;
      return await db.query(sql, [`%${value}`]);
    },

    whereContains: async (table, column, value) => {
      validateTable(table);
      const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` LIKE ?`;
      return await db.query(sql, [`%${value}%`]);
    },

    whereLike: async (table, column, value, caseSensitive = false) => {
      validateTable(table);
      const operator = caseSensitive ? 'LIKE BINARY' : 'LIKE';
      const sql = `SELECT * FROM \`${table}\` WHERE \`${column}\` ${operator} ?`;
      return await db.query(sql, [`%${value}%`]);
    },

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

    getTableInfo: async (table) => {
      validateTable(table);
      const sql = `
        SELECT 
          table_name,
          table_rows,
          data_length,
          index_length,
          ROUND((data_length + index_length) / 1024 / 1024, 2) as size_mb
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = ?
      `;
      return await db.getOne(sql, [table]);
    },

    listTables: async () => {
      const sql = 'SHOW TABLES';
      const results = await db.query(sql);
      return results.map(row => Object.values(row)[0]);
    },

    tableExists: async (table) => {
      const sql = `
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = ?
      `;
      const result = await db.getOne(sql, [table]);
      return result.count > 0;
    },

    optimizeTable: async (table) => {
      validateTable(table);
      const sql = `OPTIMIZE TABLE \`${table}\``;
      return await db.query(sql);
    },

    analyzeTable: async (table) => {
      validateTable(table);
      const sql = `ANALYZE TABLE \`${table}\``;
      return await db.query(sql);
    },

    raw: async (sql, params = []) => {
      const dangerousKeywords = ['DROP', 'TRUNCATE', 'DELETE', 'ALTER', 'CREATE'];
      const upperSql = sql.toUpperCase();
      
      for (const keyword of dangerousKeywords) {
        if (upperSql.includes(keyword)) {
          throw new Error(`Dangerous SQL keyword detected: ${keyword}`);
        }
      }
      
      return await db.query(sql, params);
    },

    rawUnsafe: async (sql, params = []) => {
      return await db.query(sql, params);
    },

    healthCheck: async () => {
      try {
        await db.query('SELECT 1');
        return { status: 'healthy', timestamp: new Date() };
      } catch (err) {
        return { status: 'unhealthy', error: err.message, timestamp: new Date() };
      }
    },

    getDatabaseStats: async () => {
      const sql = `
        SELECT 
          COUNT(*) as table_count,
          SUM(table_rows) as total_rows,
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as total_size_mb
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
      `;
      return await db.getOne(sql);
    },

    getPoolInfo: () => {
  const stats = pool.pool ?? pool;
  return {
    totalConnections: stats._allConnections?.length ?? 0,
    activeConnections: (stats._allConnections?.length ?? 0) - (stats._freeConnections?.length ?? 0),
    freeConnections: stats._freeConnections?.length ?? 0,
    queueLength: stats._connectionQueue?.length ?? 0
  };
}

  }
  return db;
};

module.exports = {
  createDb,
  generateCrudRoutes
};