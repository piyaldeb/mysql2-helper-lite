# 🚀 MySQL2 Helper Lite

A powerful, feature-rich MySQL query builder and ORM for Node.js with advanced caching, hooks, pagination, and comprehensive CRUD operations plus **16 creative functions** not available in standard mysql2!

[![npm version](https://img.shields.io/npm/v/mysql2-helper-lite.svg)](https://www.npmjs.com/package/mysql2-helper-lite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)

## ✨ What's New in v6.0.0

🎉 **Major Release** - Revolutionary new features that go beyond mysql2!

### 🔥 16 Creative Functions (Not in mysql2)

1. **`diff()`** - Smart comparison of two records showing only changed fields
2. **`bulkConditionalUpdate()`** - Update multiple records with different conditions
3. **`timeTravel()`** - Query records as they existed at a specific timestamp
4. **`smartMerge()`** - Intelligently merge data from multiple tables
5. **`fuzzySearch()`** - Find records with approximate matching & relevance scoring
6. **`weightedRandom()`** - Random selection with weighted probability
7. **`batchTransform()`** - Apply transformation functions to all records
8. **`snapshot()`** - Create instant backup snapshots of tables
9. **`createVersion()`** - Automatic record versioning system
10. **`conditionalAggregate()`** - Aggregate with conditional logic (CASE WHEN)
11. **`rank()`** - Rank records with RANK() and DENSE_RANK() window functions
12. **`movingAverage()`** - Calculate moving averages for time series data
13. **`findDuplicates()`** - Intelligent duplicate detection
14. **`warmCache()`** - Pre-load frequently accessed data
15. **`cascadeUpdate()`** - Update record and all related records atomically
16. **`queryStats()`** - Analyze query performance patterns

### 🛠️ Critical Bug Fixes

- ✅ Fixed deprecated median calculation (now MySQL 8.0+ compatible)
- ✅ Added missing `sqlstring` dependency
- ✅ Enhanced SQL injection protection with regex word boundaries
- ✅ Added validation for increment/decrement operations
- ✅ Fixed return values for atomic operations

---

## 📦 Installation

```bash
npm install mysql2-helper-lite
```

## 🚀 Quick Start

```javascript
const mysql = require('mysql2/promise');
const { createDb } = require('mysql2-helper-lite');

// Create connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'mydb',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize db with allowed tables
const db = createDb(pool, ['users', 'posts', 'comments'], {
  useTimestamps: true,
  enableQueryCache: true,
  cacheExpiry: 60000,
  enableHooks: true,
  defaultPagination: { limit: 50, offset: 0 }
});

// Start using!
const users = await db.selectWhere('users', { status: 'active' });
```

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useTimestamps` | Boolean | `true` | Auto-add `created_at` and `updated_at` timestamps |
| `enableQueryCache` | Boolean | `false` | Enable query result caching |
| `cacheExpiry` | Number | `60000` | Cache expiry time in milliseconds |
| `enableHooks` | Boolean | `true` | Enable lifecycle hooks |
| `defaultPagination` | Object | `{ limit: 50, offset: 0 }` | Default pagination settings |

---

## 🎯 Creative Functions (NEW!)

### 1. `diff()` - Smart Record Comparison

Compare two records and see only what changed!

```javascript
const changes = await db.diff('users', 1, 2);
console.log(changes);
// {
//   name: { from: 'John', to: 'Jane' },
//   age: { from: 25, to: 30 },
//   email: { from: 'john@example.com', to: 'jane@example.com' }
// }
```

**Perfect for:**
- Audit trails
- Version control systems
- Change detection
- Data reconciliation

---

### 2. `bulkConditionalUpdate()` - Different Updates in One Transaction

Update multiple records with different conditions, all atomically!

```javascript
const affectedRows = await db.bulkConditionalUpdate('users', [
  { where: { status: 'pending', age: { $gt: 18 } }, data: { status: 'active' } },
  { where: { last_login: { $lt: '2024-01-01' } }, data: { status: 'inactive' } },
  { where: { role: 'trial', days_active: { $gt: 30 } }, data: { role: 'premium' } }
]);
// Returns: 45 (total rows updated)
```

**Perfect for:**
- Complex business logic updates
- Conditional promotions
- Status transitions
- Batch processing

---

### 3. `timeTravel()` - Historical Data Queries

Query your data as it existed at any point in time!

```javascript
// See user data as it was on January 1st
const historicalUser = await db.timeTravel(
  'users',
  new Date('2024-01-01'),
  { id: 1 }
);
```

**Perfect for:**
- Historical reporting
- Debugging data issues
- Compliance requirements
- Temporal analytics

---

### 4. `smartMerge()` - Multi-Table Data Fusion

Merge related data from multiple tables automatically!

```javascript
const completeProfile = await db.smartMerge(
  ['users', 'user_profiles', 'user_preferences'],
  'user_id',
  123
);
// Returns: { id: 123, name: 'John', bio: '...', theme: 'dark', _source_users: true, ... }
```

**Perfect for:**
- Building complete user profiles
- Data aggregation
- API responses
- Single view of customer

---

### 5. `fuzzySearch()` - Intelligent Matching

Find records with approximate matching and relevance scoring!

```javascript
const results = await db.fuzzySearch('products', 'name', 'iPhon', 2);
// Finds: 'iPhone 15', 'iPhone 14 Pro', 'iPhone SE' with match scores
// Score 0 = exact match, Score 1 = starts with, Score 2 = contains
```

**Perfect for:**
- Search autocomplete
- Typo-tolerant search
- Product searches
- Name matching

---

### 6. `weightedRandom()` - Probability-Based Selection

Select random records with weighted probability!

```javascript
// Get featured products weighted by popularity
const featured = await db.weightedRandom('products', 'popularity_score', 5);

// Ads weighted by bid amount
const ad = await db.weightedRandom('ads', 'bid_amount', 1, { status: 'active' });
```

**Perfect for:**
- Featured content selection
- A/B testing with weights
- Lottery systems
- Advertisement rotation

---

### 7. `batchTransform()` - Functional Record Processing

Apply transformation functions to all records in chunks!

```javascript
// Uppercase all usernames
const processed = await db.batchTransform('users', async (user) => {
  return {
    ...user,
    username: user.username.toUpperCase(),
    full_name: `${user.first_name} ${user.last_name}`
  };
}, {}, 100);
// Returns: 1250 (records processed)
```

**Perfect for:**
- Data migrations
- Bulk transformations
- ETL processes
- Data cleaning

---

### 8. `snapshot()` - Instant Table Backups

Create instant backup snapshots before dangerous operations!

```javascript
const backup = await db.snapshot('users', 'users_before_migration');
// Returns: { snapshotName: 'users_before_migration', timestamp: ..., originalTable: 'users' }

// Do risky operations...
await db.bulkUpdate('users', riskyUpdates);

// Restore if needed:
// DROP TABLE users; RENAME TABLE users_before_migration TO users;
```

**Perfect for:**
- Pre-migration backups
- Testing environments
- Data recovery
- Change rollbacks

---

### 9. `createVersion()` - Automatic Versioning

Track all changes to records automatically!

```javascript
// Update user
await db.updateById('users', 1, { name: 'John Updated' });

// Create version snapshot
const versionId = await db.createVersion('users', 1, adminUserId);

// View version history
const versions = await db.selectWhere('users_versions', { record_id: 1 });
```

**Perfect for:**
- Audit trails
- Change history
- Undo functionality
- Compliance tracking

---

### 10. `conditionalAggregate()` - Smart Aggregations

Aggregate with conditional logic built-in!

```javascript
const stats = await db.conditionalAggregate('orders', [
  { func: 'SUM', column: 'amount', condition: 'status = "completed"', alias: 'completed_sales' },
  { func: 'SUM', column: 'amount', condition: 'status = "pending"', alias: 'pending_sales' },
  { func: 'COUNT', column: 'id', condition: 'amount > 100', alias: 'large_orders' },
  { func: 'AVG', column: 'amount', alias: 'avg_amount' }
]);
// { completed_sales: 15000, pending_sales: 3000, large_orders: 45, avg_amount: 125.50 }
```

**Perfect for:**
- Dashboard metrics
- Conditional statistics
- Business intelligence
- Report generation

---

### 11. `rank()` - Advanced Ranking

Rank records with tie handling using window functions!

```javascript
const leaderboard = await db.rank('users', 'score', {
  partitionBy: 'country',
  orderDirection: 'DESC',
  where: { game_id: 5 },
  limit: 100
});
// Returns records with rank_position and dense_rank columns
```

**Perfect for:**
- Leaderboards
- Performance rankings
- Top-N queries
- Competitive scoring

---

### 12. `movingAverage()` - Time Series Analysis

Calculate moving averages for trend analysis!

```javascript
const trends = await db.movingAverage('sales', 'amount', 'sale_date', 7);
// Returns: [{ sale_date: '2024-01-01', amount: 1000, moving_avg: 950 }, ...]
```

**Perfect for:**
- Stock analysis
- Sales trends
- Performance monitoring
- Predictive analytics

---

### 13. `findDuplicates()` - Intelligent Duplicate Detection

Find potential duplicates based on any fields!

```javascript
const duplicates = await db.findDuplicates('users', ['email', 'phone']);
// [
//   { email: 'john@example.com', phone: '1234567890', duplicate_count: 3, duplicate_ids: '1,5,8' }
// ]
```

**Perfect for:**
- Data cleaning
- Deduplication
- Data quality checks
- Merge operations

---

### 14. `warmCache()` - Intelligent Cache Pre-loading

Pre-load frequently accessed data into cache!

```javascript
const result = await db.warmCache('products', [
  { where: { featured: true } },
  { where: { category: 'electronics' }, options: { limit: 100 } },
  { where: { discount: { $gt: 20 } } }
]);
// { warmedQueries: 3, cacheSize: 45, timestamp: ... }
```

**Perfect for:**
- Application startup
- Peak traffic preparation
- Performance optimization
- Predictive caching

---

### 15. `cascadeUpdate()` - Relational Updates

Update a record and all related records in one transaction!

```javascript
await db.cascadeUpdate('users', 1,
  { status: 'inactive' },
  [
    { table: 'posts', foreignKey: 'author_id', data: { visible: false } },
    { table: 'comments', foreignKey: 'user_id', data: { moderated: true } }
  ]
);
// Updates user and all related posts & comments atomically
```

**Perfect for:**
- Cascade operations
- Related data updates
- Status propagation
- Data consistency

---

### 16. `queryStats()` - Performance Analytics

Analyze query performance and table statistics!

```javascript
const stats = await db.queryStats('orders', { days: 30 });
// {
//   total_records: 15420,
//   avg_row_size: 256,
//   latest_record: '2024-11-06T...',
//   oldest_record: '2024-10-07T...',
//   days_with_data: 28
// }
```

**Perfect for:**
- Performance monitoring
- Capacity planning
- Data growth analysis
- Optimization insights

---

## 📚 Standard API Reference

### Core CRUD Operations

#### Insert Operations
```javascript
// Insert single record
const id = await db.insert('users', { name: 'John', email: 'john@example.com' });

// Insert and return full record
const user = await db.insertAndReturn('users', { name: 'Jane' });

// Bulk insert
await db.bulkInsert('users', [{ name: 'User1' }, { name: 'User2' }]);

// Upsert (insert or update)
await db.upsert('users', { id: 1, name: 'Updated' }, ['id']);
```

#### Update Operations
```javascript
// Update by ID
await db.updateById('users', 1, { name: 'Updated Name' });

// Update by ID and return
const updated = await db.updateByIdAndReturn('users', 1, { name: 'John' });

// Update where conditions
const count = await db.updateWhere('users', { status: 'pending' }, { status: 'active' });

// Batch update
await db.batchUpdate('users', [
  { id: 1, name: 'User 1' },
  { id: 2, name: 'User 2' }
]);
```

#### Delete Operations
```javascript
// Hard delete
await db.deleteById('users', 1);

// Soft delete (sets deleted_at)
await db.deleteById('users', 1, true);

// Delete where
const deleted = await db.deleteWhere('users', { status: 'banned' });

// Batch delete
await db.batchDelete('users', [1, 2, 3, 4, 5]);

// Restore soft deleted
await db.restore('users', 1);
```

#### Select Operations
```javascript
// Simple select
const users = await db.selectWhere('users', { status: 'active' });

// Advanced select
const results = await db.select('users', {
  columns: ['id', 'name', 'email'],
  where: { status: 'active' },
  orderBy: [{ column: 'created_at', direction: 'DESC' }],
  limit: 10,
  useCache: true
});

// Find one
const user = await db.findOne('users', { email: 'john@example.com' });

// Find or create
const { record, created } = await db.findOrCreate(
  'settings',
  { user_id: 1, key: 'theme' },
  { value: 'dark' }
);

// Get by IDs
const users = await db.getByIds('users', [1, 2, 3, 4]);
```

### Pagination

```javascript
// Offset pagination
const { data, pagination } = await db.paginate('users', {
  page: 1,
  perPage: 20,
  where: { status: 'active' },
  orderBy: [{ column: 'created_at', direction: 'DESC' }]
});

// Cursor pagination (better for large datasets)
const { data, nextCursor, hasMore } = await db.cursorPaginate('users', {
  cursor: lastId,
  limit: 20,
  cursorColumn: 'id',
  direction: 'ASC'
});
```

### Aggregations

```javascript
// Simple aggregates
const count = await db.count('users', { status: 'active' });
const min = await db.min('products', 'price');
const max = await db.max('products', 'price');
const avg = await db.avg('orders', 'amount');
const sum = await db.sum('orders', 'amount');
const median = await db.median('users', 'age'); // MySQL 8.0+ compatible!

// Complex aggregation
const stats = await db.aggregate('orders', {
  functions: [
    { func: 'SUM', column: 'amount', alias: 'total' },
    { func: 'AVG', column: 'amount', alias: 'average' }
  ],
  groupBy: ['status'],
  where: { created_at: { $gte: '2024-01-01' } }
});

// Pivot tables
const pivot = await db.pivotTable('sales', ['region'], 'product', 'amount', {
  aggregate: 'SUM',
  includeTotals: true
});
```

### Search Operations

```javascript
// Simple search
const results = await db.search('users', ['name', 'email'], 'john');

// Advanced search
const users = await db.advancedSearch('users', {
  age: { operator: '>=', value: 18 },
  status: { operator: 'IN', value: ['active', 'premium'] },
  name: { operator: 'LIKE', value: 'John' }
});

// Full-text search (requires FULLTEXT index)
const articles = await db.fullTextSearch('posts', ['title', 'content'], 'javascript');
```

### Joins

```javascript
// Simple join
const data = await db.join({
  baseTable: 'users',
  joinTable: 'posts',
  baseKey: 'id',
  joinKey: 'user_id',
  joinType: 'LEFT'
});

// Multi-join
const data = await db.multiJoin({
  baseTable: 'orders',
  joins: [
    { table: 'users', type: 'INNER', baseColumn: 'user_id', joinColumn: 'id' },
    { table: 'products', type: 'LEFT', baseColumn: 'product_id', joinColumn: 'id' }
  ],
  columns: ['orders.*', 'users.name', 'products.title']
});
```

### Increment/Decrement

```javascript
// Increment single field
await db.increment('users', 1, 'login_count', 1);

// Decrement
await db.decrement('products', 5, 'stock', 10);

// Increment multiple fields
await db.incrementMany('users', 1, { views: 1, clicks: 1 });
```

### Transactions

```javascript
const result = await db.transaction(async (connection) => {
  const orderId = await db.insert('orders', orderData);
  await db.updateById('users', userId, { balance: newBalance });
  await db.insert('order_items', itemsData);
  return orderId;
});
```

### Hooks

```javascript
// Add before hook
db.addHook('before', 'insert', async (data) => {
  data.data.slug = slugify(data.data.title);
  return data;
});

// Add after hook
db.addHook('after', 'insert', async (data) => {
  await sendNotification('New record created', data.id);
  return data;
});

// Remove hook
db.removeHook('before', 'insert');
```

### Cache Management

```javascript
// Clear specific table cache
db.clearCache('users');

// Clear all cache
db.clearCache();

// Get cache stats
const stats = db.getCacheStats();
// { size: 42, enabled: true, expiry: 60000 }
```

### Utility Functions

```javascript
// Health check
const health = await db.healthCheck();

// Table schema
const schema = await db.getTableSchema('users');

// Table indexes
const indexes = await db.getTableIndexes('users');

// Table info
const info = await db.getTableInfo('users');

// List all tables
const tables = await db.listTables();

// Check if table exists
const exists = await db.tableExists('users');

// Optimize table
await db.optimizeTable('users');

// Get pool info
const poolInfo = db.getPoolInfo();

// Database stats
const stats = await db.getDatabaseStats();
```

---

## 🎯 Real-World Examples

### E-Commerce Platform

```javascript
// Create order with all relations
const orderId = await db.transaction(async () => {
  const order = await db.insertAndReturn('orders', {
    user_id: userId,
    total: 299.99,
    status: 'pending'
  });

  await db.bulkInsert('order_items', items.map(item => ({
    order_id: order.id,
    product_id: item.id,
    quantity: item.quantity
  })));

  for (const item of items) {
    await db.decrement('products', item.id, 'stock', item.quantity);
  }

  return order.id;
});

// Find duplicates and merge
const dupes = await db.findDuplicates('customers', ['email', 'phone']);
for (const dupe of dupes) {
  const ids = dupe.duplicate_ids.split(',');
  const primary = ids[0];
  const merged = await db.smartMerge(['customers', 'customer_profiles'], 'id', primary);
  // Merge and clean up duplicates...
}

// Weighted product recommendations
const recommended = await db.weightedRandom('products', 'popularity_score', 5, {
  category: userPreference
});
```

### Analytics Dashboard

```javascript
// Calculate moving average for sales
const salesTrend = await db.movingAverage('daily_sales', 'amount', 'date', 7);

// Conditional aggregates for dashboard
const metrics = await db.conditionalAggregate('orders', [
  { func: 'SUM', column: 'amount', condition: 'status="completed"', alias: 'revenue' },
  { func: 'COUNT', column: 'id', condition: 'status="pending"', alias: 'pending_count' },
  { func: 'AVG', column: 'amount', alias: 'avg_order_value' }
]);

// Performance statistics
const perfStats = await db.queryStats('orders', { days: 30 });

// Rank top customers
const topCustomers = await db.rank('customers', 'total_spent', {
  orderDirection: 'DESC',
  limit: 50
});
```

### Content Management

```javascript
// Create versioned content
await db.updateById('articles', articleId, { content: newContent });
await db.createVersion('articles', articleId, editorId);

// Time travel to see old version
const oldVersion = await db.timeTravel('articles', new Date('2024-01-01'), { id: articleId });

// Fuzzy search with typo tolerance
const results = await db.fuzzySearch('articles', 'title', userSearchTerm, 2);

// Cascade update on author status change
await db.cascadeUpdate('authors', authorId,
  { status: 'inactive' },
  [
    { table: 'articles', foreignKey: 'author_id', data: { visible: false } },
    { table: 'comments', foreignKey: 'author_id', data: { moderated: true } }
  ]
);
```

---

## 🔒 Security Features

- ✅ **Table Whitelisting** - Only allowed tables can be queried
- ✅ **SQL Injection Prevention** - All methods use parameterized queries
- ✅ **Dangerous Keyword Detection** - Raw queries block unsafe operations
- ✅ **Input Validation** - All inputs are validated before execution

---

## 🚀 Performance Features

- ⚡ **Query Caching** - Optional in-memory caching with TTL
- 📊 **Slow Query Logging** - Automatic detection of slow queries (>500ms)
- 🔄 **Connection Pooling** - Built-in support for connection pools
- 📦 **Batch Operations** - Efficient bulk inserts and updates
- 🎯 **Smart Cache Invalidation** - Automatic cache clearing on updates

---

## 📖 Database Schema Requirements

### For Timestamps
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### For Soft Deletes
```sql
CREATE TABLE posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  deleted_at DATETIME NULL
);
```

### For Versioning
```sql
CREATE TABLE users_versions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  record_id INT,
  data TEXT,
  user_id INT,
  version_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🤝 Contributing

Contributions are welcome! Please check out our [Contributing Guide](CONTRIBUTING.md).

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/piyaldeb/mysql2-helper-lite/issues)
- **Email**: piyaldeb87@gmail.com

---

## 🌟 Show Your Support

If this library helped you, please:
- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest new features
- 📖 Improve documentation
- 🔀 Contribute code

---

**Made with ❤️ for the developer community**
