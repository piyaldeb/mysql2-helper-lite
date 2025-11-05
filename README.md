# MySQL DB Wrapper Pro

A powerful MySQL database wrapper with advanced querying, caching, pagination, hooks, and 30+ utility methods.

## 🚀 Features

- ✅ Query caching with auto-invalidation
- ✅ Advanced search with multiple operators
- ✅ Pagination with metadata
- ✅ Aggregate functions (min, max, avg, sum)
- ✅ Full-text search
- ✅ Upsert & batch operations
- ✅ Lifecycle hooks (before/after)
- ✅ Transaction support
- ✅ Soft deletes
- ✅ Multi-table joins
- ✅ Audit logging
- ✅ 30+ utility methods

## 📦 Installation

\`\`\`bash
npm install mysql-db-wrapper-pro mysql2
\`\`\`

## 🔧 Quick Start

\`\`\`javascript
const mysql = require('mysql2/promise');
const { createDb } = require('mysql-db-wrapper-pro');

// Create connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'mydb',
  waitForConnections: true,
  connectionLimit: 10
});

// Initialize DB wrapper
const db = createDb(pool, ['users', 'posts', 'comments'], {
  useTimestamps: true,
  enableQueryCache: true,
  cacheExpiry: 60000 // 1 minute
});

// Start using!
async function example() {
  // Insert
  const userId = await db.insert('users', {
    name: 'John Doe',
    email: 'john@example.com'
  });

  // Paginate
  const result = await db.paginate('users', {
    page: 1,
    perPage: 20,
    where: { status: 'active' },
    orderBy: [{ column: 'created_at', direction: 'DESC' }]
  });

  // Advanced search
  const users = await db.advancedSearch('users', {
    age: { operator: '>', value: 18 },
    email: { operator: 'LIKE', value: 'gmail.com' }
  });

  // Aggregates
  const totalPosts = await db.count('posts', { status: 'published' });
  const avgViews = await db.avg('posts', 'views');
}
\`\`\`

## 📚 Documentation

### Core Methods

#### Insert
\`\`\`javascript
await db.insert('users', { name: 'John', email: 'john@example.com' });
await db.insertAndReturn('users', { name: 'Jane' }); // Returns full record
await db.upsert('users', { id: 1, name: 'Updated' }); // Insert or update
await db.bulkInsert('users', [{ name: 'A' }, { name: 'B' }]);
\`\`\`

#### Update
\`\`\`javascript
await db.updateById('users', 1, { name: 'New Name' });
await db.updateWhere('users', { status: 'pending' }, { status: 'active' });
await db.increment('users', 1, 'login_count');
\`\`\`

#### Delete
\`\`\`javascript
await db.deleteById('users', 1);
await db.deleteById('users', 1, true); // Soft delete
await db.deleteWhere('users', { status: 'inactive' });
\`\`\`

#### Query
\`\`\`javascript
// Simple
const users = await db.selectWhere('users', { status: 'active' });
const user = await db.findOne('users', { email: 'test@example.com' });

// Advanced
const results = await db.select('users', {
  columns: ['id', 'name', 'email'],
  where: { status: 'active' },
  orderBy: [{ column: 'created_at', direction: 'DESC' }],
  limit: 10,
  offset: 0
});
\`\`\`

### Advanced Features

#### Pagination
\`\`\`javascript
const result = await db.paginate('posts', {
  page: 2,
  perPage: 20,
  where: { published: true },
  orderBy: [{ column: 'created_at', direction: 'DESC' }]
});
// Returns: { data: [...], pagination: { total, page, perPage, totalPages, hasNext, hasPrev } }
\`\`\`

#### Advanced Search
\`\`\`javascript
const users = await db.advancedSearch('users', {
  age: { operator: '>', value: 18 },
  email: { operator: 'LIKE', value: 'gmail.com' },
  status: { operator: 'IN', value: ['active', 'pending'] },
  created_at: { operator: 'BETWEEN', value: { min: '2024-01-01', max: '2024-12-31' } }
});
\`\`\`

#### Aggregates
\`\`\`javascript
const total = await db.count('users', { status: 'active' });
const sum = await db.sum('orders', 'amount', { status: 'completed' });
const avg = await db.avg('products', 'price');
const min = await db.min('products', 'price');
const max = await db.max('products', 'price');

// Custom aggregates
const stats = await db.aggregate('orders', {
  functions: [
    { func: 'SUM', column: 'amount', alias: 'total' },
    { func: 'AVG', column: 'amount', alias: 'average' },
    { func: 'COUNT', column: '*', alias: 'count' }
  ],
  groupBy: ['status'],
  where: { created_at: '2024-01-01' }
});
\`\`\`

#### Hooks
\`\`\`javascript
db.addHook('before', 'insert', async (data) => {
  // Validate or transform data
  data.data.email = data.data.email.toLowerCase();
  return data;
});

db.addHook('after', 'insert', async (data) => {
  console.log('New record inserted:', data.id);
  return data;
});
\`\`\`

#### Transactions
\`\`\`javascript
await db.transaction(async (connection) => {
  await connection.execute('INSERT INTO users ...');
  await connection.execute('INSERT INTO profiles ...');
  // Auto-commits if no error, auto-rollbacks on error
});
\`\`\`

#### Cache
\`\`\`javascript
// Use cache
const users = await db.selectWhere('users', {}, { useCache: true });

// Clear cache
db.clearCache('users'); // Clear specific table
db.clearCache(); // Clear all

// Cache stats
const stats = db.getCacheStats();
\`\`\`

## ⚙️ Configuration Options

\`\`\`javascript
const db = createDb(pool, allowedTables, {
  useTimestamps: true,           // Auto-add created_at/updated_at
  enableQueryCache: true,        // Enable query caching
  cacheExpiry: 60000,           // Cache TTL in ms
  enableHooks: true,            // Enable lifecycle hooks
  defaultPagination: {          // Default pagination settings
    limit: 50,
    offset: 0
  }
});
\`\`\`

## 🔒 Security Features

- ✅ Table whitelist validation
- ✅ Parameterized queries (SQL injection prevention)
- ✅ Dangerous SQL keyword detection in raw queries
- ✅ Audit logging support

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 💬 Support

For issues and questions: [GitHub Issues](https://github.com/piyaldeb/mysql2-helper-lite.git/issues)
\`\`\`