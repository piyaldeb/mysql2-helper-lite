# MySQL DB Helper

A powerful, feature-rich MySQL query builder and ORM for Node.js with advanced caching, hooks, pagination, and comprehensive CRUD operations.

[![npm version](https://img.shields.io/npm/v/mysql-db-helper.svg)](https://www.npmjs.com/package/mysql2-helper-lite)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📦 Installation

```bash
npm npm i mysql2-helper-lite
```

## 🚀 Quick Start

```javascript
const mysql = require('mysql2/promise');
const { createDb } = require('mysql-db-helper');

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
| `cacheExpiry` | Number | `60000` | Cache expiry time in milliseconds (1 minute) |
| `enableHooks` | Boolean | `true` | Enable lifecycle hooks (before/after operations) |
| `defaultPagination` | Object | `{ limit: 50, offset: 0 }` | Default pagination settings |

## 📚 API Reference

### Core Query Methods

#### `query(sql, params, useCache)`
Execute raw SQL queries with optional caching and performance monitoring.

```javascript
const users = await db.query('SELECT * FROM users WHERE age > ?', [18], true);
// Automatically logs slow queries (>500ms)
```

**Parameters:**
- `sql` (string): SQL query with placeholders
- `params` (array): Parameters for placeholders
- `useCache` (boolean): Enable caching for this query

**Returns:** Array of result rows

---

#### `getOne(sql, params, useCache)`
Execute a query and return only the first result.

```javascript
const user = await db.getOne('SELECT * FROM users WHERE id = ?', [1]);
// Returns: { id: 1, name: 'John', ... } or null
```

**Returns:** Single row object or `null`

---

### Insert Operations

#### `insert(table, data)`
Insert a single record and return the insert ID.

```javascript
const userId = await db.insert('users', {
  name: 'John Doe',
  email: 'john@example.com',
  age: 25
});
// Returns: 1 (insert ID)
// Auto-adds created_at and updated_at if useTimestamps is enabled
```

---

#### `insertAndReturn(table, data, idField)`
Insert a record and return the complete inserted row.

```javascript
const user = await db.insertAndReturn('users', {
  name: 'Jane Doe',
  email: 'jane@example.com'
});
// Returns: { id: 2, name: 'Jane Doe', email: 'jane@example.com', created_at: ..., updated_at: ... }
```

**Parameters:**
- `table` (string): Table name
- `data` (object): Data to insert
- `idField` (string): ID field name (default: 'id')

---

#### `bulkInsert(table, dataArray)`
Insert multiple records in a single query.

```javascript
const affectedRows = await db.bulkInsert('users', [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
  { name: 'User 3', email: 'user3@example.com' }
]);
// Returns: 3 (number of affected rows)
```

---

#### `upsert(table, data, conflictKeys)`
Insert or update if a record with the same unique key exists.

```javascript
const result = await db.upsert('users', {
  id: 1,
  name: 'John Updated',
  email: 'john@example.com',
  age: 26
}, ['id']);
// If id=1 exists, updates the record; otherwise inserts new
```

**Parameters:**
- `table` (string): Table name
- `data` (object): Data to insert/update
- `conflictKeys` (array): Keys to check for conflicts (default: ['id'])

---

### Update Operations

#### `updateById(table, id, data, idField)`
Update a single record by its ID.

```javascript
await db.updateById('users', 1, {
  name: 'John Smith',
  age: 30
});
// Auto-updates updated_at if useTimestamps is enabled
```

**Parameters:**
- `table` (string): Table name
- `id` (any): ID value
- `data` (object): Data to update
- `idField` (string): ID field name (default: 'id')

---

#### `updateWhere(table, conditions, data)`
Update records matching specific conditions.

```javascript
const affectedRows = await db.updateWhere(
  'users',
  { status: 'pending', role: 'user' },
  { status: 'active' }
);
// Returns: number of updated rows
```

**Parameters:**
- `table` (string): Table name
- `conditions` (object): WHERE conditions
- `data` (object): Data to update

**Returns:** Number of affected rows

---

#### `batchUpdate(table, updates, idField)`
Update multiple records with different data in a transaction.

```javascript
const count = await db.batchUpdate('users', [
  { id: 1, status: 'active', score: 100 },
  { id: 2, status: 'inactive', score: 50 },
  { id: 3, status: 'pending', score: 75 }
]);
// Returns: 3 (number of updated records)
```

**Parameters:**
- `table` (string): Table name
- `updates` (array): Array of objects with id and data to update
- `idField` (string): ID field name (default: 'id')

---

### Delete Operations

#### `deleteById(table, id, soft, idField)`
Delete a single record by ID (supports soft delete).

```javascript
// Hard delete
await db.deleteById('users', 1);

// Soft delete (sets deleted_at to current timestamp)
await db.deleteById('users', 2, true);
```

**Parameters:**
- `table` (string): Table name
- `id` (any): ID value
- `soft` (boolean): Enable soft delete (default: false)
- `idField` (string): ID field name (default: 'id')

---

#### `deleteWhere(table, conditions, soft)`
Delete records matching specific conditions.

```javascript
const deletedCount = await db.deleteWhere('users', { status: 'banned' });
// Returns: number of deleted rows

// Soft delete
const softDeletedCount = await db.deleteWhere('users', { inactive_days: 365 }, true);
```

**Returns:** Number of affected rows

---

#### `truncate(table)`
Remove all records from a table (TRUNCATE).

```javascript
await db.truncate('temporary_logs');
// Resets auto-increment counter
```

---

### Select Operations

#### `selectWhere(table, conditions, options)`
Select records matching conditions.

```javascript
const activeUsers = await db.selectWhere('users', { status: 'active' });

// With options
const recentUsers = await db.selectWhere('users', { status: 'active' }, {
  limit: 10,
  offset: 0,
  useCache: true
});
```

**Parameters:**
- `table` (string): Table name
- `conditions` (object): WHERE conditions
- `options` (object): Query options (limit, offset, useCache)

---

#### `select(table, options)`
Advanced select with complex options.

```javascript
const users = await db.select('users', {
  columns: ['id', 'name', 'email', 'COUNT(*) as total'],
  where: { status: 'active' },
  whereRaw: 'age > 18',
  orderBy: [
    { column: 'created_at', direction: 'DESC' },
    'name ASC'
  ],
  groupBy: ['role'],
  having: 'COUNT(*) > 5',
  limit: 20,
  offset: 0,
  useCache: true
});
```

**Options:**
- `columns` (array): Columns to select (default: ['*'])
- `where` (object): WHERE conditions
- `whereRaw` (string): Raw WHERE clause
- `orderBy` (array): Order by clauses
- `groupBy` (array): Group by columns
- `having` (string): HAVING clause
- `limit` (number): Result limit
- `offset` (number): Result offset
- `useCache` (boolean): Enable caching

---

#### `findOne(table, conditions)`
Find a single record matching conditions.

```javascript
const user = await db.findOne('users', { email: 'john@example.com' });
// Returns: { id: 1, name: 'John', ... } or null
```

---

#### `getByIds(table, ids, idField)`
Get multiple records by their IDs.

```javascript
const users = await db.getByIds('users', [1, 2, 3, 4, 5]);
// Returns: Array of user objects
```

---

### Pagination

#### `paginate(table, options)`
Get paginated results with metadata.

```javascript
const result = await db.paginate('users', {
  page: 1,
  perPage: 20,
  where: { status: 'active' },
  orderBy: [{ column: 'created_at', direction: 'DESC' }]
});

console.log(result);
// {
//   data: [ {...}, {...}, ... ],
//   pagination: {
//     total: 156,
//     page: 1,
//     perPage: 20,
//     totalPages: 8,
//     hasNext: true,
//     hasPrev: false
//   }
// }
```

**Options:**
- `page` (number): Page number (default: 1)
- `perPage` (number): Items per page (default: 20)
- `where` (object): WHERE conditions
- `orderBy` (array): Order by clauses

---

### Counting and Existence

#### `count(table, conditions)`
Count records matching conditions.

```javascript
const activeUserCount = await db.count('users', { status: 'active' });
// Returns: 42

const totalUsers = await db.count('users');
// Returns: 156
```

---

#### `exists(table, conditions)`
Check if a record exists.

```javascript
const emailExists = await db.exists('users', { email: 'john@example.com' });
// Returns: true or false
```

---

### Aggregate Functions

#### `aggregate(table, options)`
Perform complex aggregate operations.

```javascript
const stats = await db.aggregate('orders', {
  functions: [
    { func: 'SUM', column: 'amount', alias: 'total_sales' },
    { func: 'COUNT', column: 'id', alias: 'order_count' },
    { func: 'AVG', column: 'amount', alias: 'avg_order' }
  ],
  groupBy: ['user_id'],
  where: { status: 'completed' },
  having: 'SUM(amount) > 1000'
});

// Returns: [
//   { user_id: 1, total_sales: 5000, order_count: 12, avg_order: 416.67 },
//   { user_id: 2, total_sales: 3500, order_count: 8, avg_order: 437.50 },
//   ...
// ]
```

---

#### `min(table, column, where)` / `max(table, column, where)` / `avg(table, column, where)` / `sum(table, column, where)`
Quick aggregate functions.

```javascript
const minAge = await db.min('users', 'age', { status: 'active' });
// Returns: 18

const maxSalary = await db.max('employees', 'salary');
// Returns: 150000

const avgRating = await db.avg('products', 'rating', { category: 'electronics' });
// Returns: 4.3

const totalRevenue = await db.sum('orders', 'amount', { year: 2024 });
// Returns: 1250000
```

---

### Search Operations

#### `search(table, fields, keyword)`
Simple search across multiple fields.

```javascript
const results = await db.search('users', ['name', 'email', 'bio'], 'john');
// Searches for 'john' in name, email, or bio fields
```

---

#### `advancedSearch(table, criteria, options)`
Search with multiple operators (LIKE, IN, BETWEEN, etc.).

```javascript
const users = await db.advancedSearch('users', {
  status: 'active',
  age: { operator: '>=', value: 18 },
  name: { operator: 'LIKE', value: 'John' },
  role: { operator: 'IN', value: ['admin', 'moderator'] },
  created_at: { operator: 'BETWEEN', value: { min: '2024-01-01', max: '2024-12-31' } },
  email_verified: { operator: 'IS NOT NULL' }
}, {
  limit: 100,
  offset: 0,
  orderBy: [{ column: 'created_at', direction: 'DESC' }]
});
```

**Supported Operators:**
- `=` (default)
- `>`, `>=`, `<`, `<=`, `!=`
- `LIKE`
- `IN`
- `BETWEEN`
- `IS NULL`
- `IS NOT NULL`

---

#### `fullTextSearch(table, columns, searchTerm, options)`
Full-text search with relevance scoring (requires FULLTEXT index).

```javascript
const articles = await db.fullTextSearch('articles', ['title', 'content'], 'javascript tutorial', {
  mode: 'NATURAL LANGUAGE', // or 'BOOLEAN', 'QUERY EXPANSION'
  limit: 50,
  minScore: 0.5
});

// Returns results ordered by relevance
```

---

#### `distinctValues(table, column)`
Get distinct values from a column.

```javascript
const roles = await db.distinctValues('users', 'role');
// Returns: [{ role: 'admin' }, { role: 'user' }, { role: 'moderator' }]
```

---

### Increment/Decrement

#### `increment(table, id, field, amount, idField)`
Increment a numeric field atomically.

```javascript
await db.increment('users', 1, 'login_count', 1);
// Increments login_count by 1 for user with id=1

await db.increment('products', 5, 'stock', 100);
// Adds 100 to stock for product with id=5
```

---

#### `decrement(table, id, field, amount, idField)`
Decrement a numeric field atomically.

```javascript
await db.decrement('products', 5, 'stock', 1);
// Reduces stock by 1 for product with id=5
```

---

### Join Operations

#### `join(options)`
Simple join between two tables.

```javascript
const usersWithPosts = await db.join({
  baseTable: 'users',
  joinTable: 'posts',
  baseKey: 'id',
  joinKey: 'user_id',
  conditions: { 'users.status': 'active' },
  columns: ['users.*', 'posts.title', 'posts.created_at as post_date'],
  joinType: 'INNER' // or 'LEFT', 'RIGHT'
});
```

---

#### `multiJoin(options)`
Join multiple tables with support for all join types.

```javascript
const data = await db.multiJoin({
  baseTable: 'orders',
  baseAlias: 'o',
  joins: [
    {
      table: 'users',
      alias: 'u',
      type: 'INNER',
      baseColumn: 'user_id',
      joinColumn: 'id'
    },
    {
      table: 'products',
      alias: 'p',
      type: 'LEFT',
      baseColumn: 'product_id',
      joinColumn: 'id'
    },
    {
      table: 'payments',
      alias: 'pay',
      type: 'LEFT',
      baseColumn: 'id',
      joinColumn: 'order_id'
    }
  ],
  conditions: { 'o.status': 'completed' },
  columns: [
    'o.*',
    'u.name as customer_name',
    'p.name as product_name',
    'pay.amount as payment_amount'
  ]
});
```

---

### Transactions

#### `transaction(callback)`
Execute multiple operations in a transaction.

```javascript
const result = await db.transaction(async (connection) => {
  // All operations here are within the transaction
  const orderId = await db.insert('orders', {
    user_id: 1,
    total: 100
  });
  
  await db.updateById('users', 1, {
    balance: 900
  });
  
  await db.insert('order_items', {
    order_id: orderId,
    product_id: 5,
    quantity: 2
  });
  
  return orderId;
});
// All operations committed together, or rolled back if any fails
```

---

### Hooks

#### `addHook(type, operation, callback)`
Add lifecycle hooks for operations.

```javascript
// Before insert hook
db.addHook('before', 'insert', async (data) => {
  console.log('About to insert:', data);
  // Modify data before insert
  data.data.slug = data.data.title.toLowerCase().replace(/\s+/g, '-');
  return data;
});

// After insert hook
db.addHook('after', 'insert', async (data) => {
  console.log('Inserted record:', data);
  // Perform additional actions after insert
  await logActivity('New record created', data.id);
  return data;
});
```

**Hook Types:**
- `before`: Executed before operation
- `after`: Executed after operation

**Operations:**
- `insert`
- Custom operations you define

---

#### `removeHook(type, operation)`
Remove a previously added hook.

```javascript
db.removeHook('before', 'insert');
```

---

### Cache Management

#### `clearCache(table)`
Clear query cache for a specific table or all tables.

```javascript
// Clear cache for specific table
db.clearCache('users');

// Clear all cache
db.clearCache();
```

---

#### `getCacheStats()`
Get cache statistics.

```javascript
const stats = db.getCacheStats();
console.log(stats);
// { size: 25, enabled: true, expiry: 60000 }
```

---

### Database Utilities

#### `getTableSchema(table)`
Get the schema/structure of a table.

```javascript
const schema = await db.getTableSchema('users');
console.log(schema);
// [
//   { Field: 'id', Type: 'int(11)', Null: 'NO', Key: 'PRI', ... },
//   { Field: 'name', Type: 'varchar(255)', Null: 'NO', Key: '', ... },
//   ...
// ]
```

---

#### `getTableIndexes(table)`
Get all indexes on a table.

```javascript
const indexes = await db.getTableIndexes('users');
console.log(indexes);
// Shows all indexes including primary keys, unique keys, etc.
```

---

#### `healthCheck()`
Check database connection health.

```javascript
const health = await db.healthCheck();
console.log(health);
// { status: 'healthy', timestamp: 2024-11-06T... }
// or
// { status: 'unhealthy', error: 'Connection timeout', timestamp: ... }
```

---

#### `raw(sql, params)`
Execute raw SQL with basic safety checks.

```javascript
const results = await db.raw('SELECT * FROM users WHERE age > ?', [18]);
// Note: Dangerous keywords (DROP, TRUNCATE, DELETE, ALTER, CREATE) are blocked
```

---

### Audit Logging

#### `logAudit(action, table, data, userId)`
Log operations to audit_logs table (if enabled).

```javascript
await db.logAudit('UPDATE', 'users', { id: 1, name: 'New Name' }, 123);
// Logs the action to audit_logs table
```

**Note:** Requires `audit_logs` table in allowedTables list.

---

## 🎯 Common Use Cases

### User Management

```javascript
// Register new user
const userId = await db.insert('users', {
  name: 'John Doe',
  email: 'john@example.com',
  password: hashedPassword,
  role: 'user'
});

// Login - find user
const user = await db.findOne('users', { email: 'john@example.com' });
if (user && await verifyPassword(password, user.password)) {
  await db.increment('users', user.id, 'login_count');
}

// Get active users with pagination
const { data, pagination } = await db.paginate('users', {
  page: 1,
  perPage: 20,
  where: { status: 'active' },
  orderBy: [{ column: 'created_at', direction: 'DESC' }]
});

// Search users
const searchResults = await db.search('users', ['name', 'email'], 'john');

// Soft delete user
await db.deleteById('users', userId, true);
```

---

### E-commerce Order Processing

```javascript
// Create order with transaction
const orderId = await db.transaction(async (connection) => {
  // Create order
  const orderId = await db.insert('orders', {
    user_id: userId,
    total: totalAmount,
    status: 'pending'
  });
  
  // Add order items
  await db.bulkInsert('order_items', orderItems.map(item => ({
    order_id: orderId,
    product_id: item.product_id,
    quantity: item.quantity,
    price: item.price
  })));
  
  // Update product stock
  for (const item of orderItems) {
    await db.decrement('products', item.product_id, 'stock', item.quantity);
  }
  
  // Update user stats
  await db.increment('users', userId, 'order_count');
  
  return orderId;
});

// Get orders with user and product details
const orders = await db.multiJoin({
  baseTable: 'orders',
  baseAlias: 'o',
  joins: [
    { table: 'users', alias: 'u', type: 'INNER', baseColumn: 'user_id', joinColumn: 'id' },
    { table: 'order_items', alias: 'oi', type: 'LEFT', baseColumn: 'id', joinColumn: 'order_id' },
    { table: 'products', alias: 'p', type: 'LEFT', baseColumn: 'product_id', joinColumn: 'id' }
  ],
  columns: ['o.*', 'u.name as customer_name', 'u.email', 'p.name as product_name', 'oi.quantity', 'oi.price']
});

// Get sales statistics
const salesStats = await db.aggregate('orders', {
  functions: [
    { func: 'SUM', column: 'total', alias: 'total_revenue' },
    { func: 'COUNT', column: 'id', alias: 'order_count' },
    { func: 'AVG', column: 'total', alias: 'avg_order_value' }
  ],
  groupBy: ['DATE(created_at)'],
  where: { status: 'completed' },
  having: 'SUM(total) > 1000'
});
```

---

### Blog/CMS System

```javascript
// Create post
const postId = await db.insertAndReturn('posts', {
  title: 'My First Post',
  content: 'Post content here...',
  author_id: userId,
  status: 'published'
});

// Full-text search posts
const searchResults = await db.fullTextSearch('posts', ['title', 'content'], 'javascript tutorial', {
  mode: 'NATURAL LANGUAGE',
  limit: 10
});

// Get posts with author info
const posts = await db.join({
  baseTable: 'posts',
  joinTable: 'users',
  baseKey: 'author_id',
  joinKey: 'id',
  columns: ['posts.*', 'users.name as author_name', 'users.avatar'],
  conditions: { 'posts.status': 'published' }
});

// Advanced search
const filteredPosts = await db.advancedSearch('posts', {
  status: 'published',
  category: { operator: 'IN', value: ['tech', 'programming'] },
  views: { operator: '>', value: 100 },
  title: { operator: 'LIKE', value: 'JavaScript' }
}, {
  limit: 20,
  orderBy: [{ column: 'views', direction: 'DESC' }]
});

// Update view count
await db.increment('posts', postId, 'views');

// Get post statistics by category
const stats = await db.aggregate('posts', {
  functions: [
    { func: 'COUNT', column: 'id', alias: 'post_count' },
    { func: 'AVG', column: 'views', alias: 'avg_views' }
  ],
  groupBy: ['category'],
  where: { status: 'published' }
});
```

---

### Analytics and Reporting

```javascript
// Daily active users
const dailyActiveUsers = await db.aggregate('user_sessions', {
  functions: [
    { func: 'COUNT', column: 'DISTINCT user_id', alias: 'active_users' }
  ],
  groupBy: ['DATE(created_at)'],
  where: { status: 'active' }
});

// Revenue by month
const monthlyRevenue = await db.query(`
  SELECT 
    DATE_FORMAT(created_at, '%Y-%m') as month,
    SUM(amount) as revenue,
    COUNT(*) as transactions
  FROM orders
  WHERE status = 'completed'
  GROUP BY DATE_FORMAT(created_at, '%Y-%m')
  ORDER BY month DESC
`, [], true); // Use cache

// Top selling products
const topProducts = await db.select('products', {
  columns: ['id', 'name', 'sales_count', 'revenue'],
  orderBy: [{ column: 'sales_count', direction: 'DESC' }],
  limit: 10,
  useCache: true
});

// Complex analytics query
const userEngagement = await db.multiJoin({
  baseTable: 'users',
  baseAlias: 'u',
  joins: [
    { table: 'posts', alias: 'p', type: 'LEFT', baseColumn: 'id', joinColumn: 'author_id' },
    { table: 'comments', alias: 'c', type: 'LEFT', baseColumn: 'id', joinColumn: 'user_id' }
  ],
  columns: [
    'u.id',
    'u.name',
    'COUNT(DISTINCT p.id) as post_count',
    'COUNT(DISTINCT c.id) as comment_count'
  ]
});
```

---

## 🔒 Security Features

### Table Whitelisting
Only allowed tables can be queried, preventing unauthorized access.

```javascript
const db = createDb(pool, ['users', 'posts']); // Only these tables are accessible

await db.query('SELECT * FROM users'); // ✅ Works
await db.query('SELECT * FROM admin_secrets'); // ❌ Throws error
```

### SQL Injection Prevention
All methods use parameterized queries to prevent SQL injection.

```javascript
// Safe - uses parameterized query
const users = await db.selectWhere('users', { email: userInput });

// The raw method blocks dangerous keywords
await db.raw('DROP TABLE users'); // ❌ Throws error
```

### Dangerous Keyword Detection
Raw queries block dangerous SQL keywords (DROP, TRUNCATE, DELETE, ALTER, CREATE).

---

## 🚀 Performance Features

### Query Caching
Enable query caching to speed up repeated queries.

```javascript
const db = createDb(pool, ['users'], {
  enableQueryCache: true,
  cacheExpiry: 60000 // 1 minute
});

// First call - queries database
const users = await db.selectWhere('users', { status: 'active' }, { useCache: true });

// Second call - returns from cache (if within expiry time)
const cachedUsers = await db.selectWhere('users', { status: 'active' }, { useCache: true });

// Clear cache when data changes
await db.updateById('users', 1, { status: 'inactive' });
// Cache automatically cleared for 'users' table
```

### Slow Query Logging
Automatically logs queries that take longer than 500ms.

```javascript
// If a query takes > 500ms, you'll see:
// ⚠️ Slow query (1234ms): SELECT * FROM large_table WHERE ...
```

### Batch Operations
Process multiple records efficiently.

```javascript
// Bulk insert - single query
await db.bulkInsert('users', arrayOf1000Users);

// Batch update - transaction
await db.batchUpdate('users', arrayOfUpdates);
```

---

## 📝 Best Practices

### 1. Always Use Allowed Tables
```javascript
// Define all tables you'll use
const db = createDb(pool, [
  'users', 'posts', 'comments', 'likes', 'sessions'
]);
```

### 2. Enable Caching for Read-Heavy Operations
```javascript
// Good for frequently accessed, rarely changed data
const categories = await db.selectWhere('categories', {}, { useCache: true });
```

### 3. Use Transactions for Related Operations
```javascript
// Always wrap related operations in transactions
await db.transaction(async () => {
  await db.insert('orders', orderData);
  await db.updateById('products', productId, { stock: newStock });
  await db.insert('order_items', itemsData);
});
```

### 4. Use Pagination for Large Datasets
```javascript
// Don't load everything at once
const { data, pagination } = await db.paginate('posts', {
  page: currentPage,
  perPage: 20
});
```

### 5. Use Hooks for Business Logic
```javascript
// Centralize common logic
db.addHook('before', 'insert', async (data) => {
  if (data.table === 'users') {
    data.data.email = data.data.email.toLowerCase();
    data.data.username = data.data.username.trim();
  }
  return data;
});
```

### 6. Use Soft Deletes for Important Data
```javascript
// Allow data recovery
await db.deleteById('users', userId, true); // Soft delete

// Query non-deleted records
const activeUsers = await db.selectWhere('users', { deleted_at: null });
```

### 7. Monitor Query Performance
```javascript
// Slow queries are automatically logged
// Watch your console for warnings:
// ⚠️ Slow query (1234ms): SELECT ...

// Optimize slow queries by:
// - Adding indexes
// - Using select() with specific columns
// - Enabling caching
```

---

## 🛠️ Database Schema Requirements

### Required Columns (if using default options)

**For Timestamp Support:**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**For Soft Delete Support:**
```sql
CREATE TABLE posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  content TEXT,
  deleted_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**For Audit Logging:**
```sql
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  action VARCHAR(50),
  table_name VARCHAR(50),
  data TEXT,
  user_id INT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**For Full-Text Search:**
```sql
CREATE TABLE articles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255),
  content TEXT,
  FULLTEXT KEY ft_title_content (title, content)
);
```

---

## 🔧 Advanced Configuration

### Custom Pagination Defaults
```javascript
const db = createDb(pool, ['users'], {
  defaultPagination: {
    limit: 100,  // Default items per page
    offset: 0
  }
});
```

### Disable Timestamps
```javascript
const db = createDb(pool, ['logs'], {
  useTimestamps: false  // No auto created_at/updated_at
});
```

### Long Cache Expiry for Static Data
```javascript
const db = createDb(pool, ['countries', 'currencies'], {
  enableQueryCache: true,
  cacheExpiry: 3600000  // 1 hour
});
```

---

## 🐛 Error Handling

### Basic Error Handling
```javascript
try {
  const user = await db.findOne('users', { id: userId });
  if (!user) {
    throw new Error('User not found');
  }
} catch (error) {
  console.error('Database error:', error.message);
  // Handle error appropriately
}
```

### Transaction Error Handling
```javascript
try {
  const result = await db.transaction(async (connection) => {
    // Your operations
    return result;
  });
} catch (error) {
  console.error('Transaction failed and rolled back:', error);
  // Transaction is automatically rolled back
}
```

### Graceful Degradation with Cache
```javascript
try {
  let data = await db.selectWhere('users', { status: 'active' }, { useCache: true });
} catch (error) {
  console.error('Failed to fetch users:', error);
  // Fallback to empty array or cached data
  data = [];
}
```

---

## 🧪 Testing

### Basic Test Example
```javascript
const assert = require('assert');

describe('User Operations', () => {
  let db;
  
  before(async () => {
    // Setup test database
    db = createDb(testPool, ['users']);
  });
  
  after(async () => {
    // Cleanup
    await db.truncate('users');
  });
  
  it('should create a new user', async () => {
    const userId = await db.insert('users', {
      name: 'Test User',
      email: 'test@example.com'
    });
    
    assert.ok(userId > 0);
    
    const user = await db.findOne('users', { id: userId });
    assert.strictEqual(user.name, 'Test User');
    assert.strictEqual(user.email, 'test@example.com');
  });
  
  it('should update user', async () => {
    const userId = await db.insert('users', {
      name: 'John',
      email: 'john@example.com'
    });
    
    await db.updateById('users', userId, { name: 'John Doe' });
    
    const user = await db.findOne('users', { id: userId });
    assert.strictEqual(user.name, 'John Doe');
  });
  
  it('should paginate users', async () => {
    // Insert test data
    await db.bulkInsert('users', [
      { name: 'User 1', email: 'user1@example.com' },
      { name: 'User 2', email: 'user2@example.com' },
      { name: 'User 3', email: 'user3@example.com' }
    ]);
    
    const result = await db.paginate('users', { page: 1, perPage: 2 });
    
    assert.strictEqual(result.data.length, 2);
    assert.ok(result.pagination.hasNext);
    assert.strictEqual(result.pagination.hasPrev, false);
  });
});
```

---

## 📊 Changelog

### [4.0.0] - 2024-11-05

#### 🎉 Major Release - Powerful New Features

#### Added
- ✨ Query caching system with automatic invalidation
- 🔍 Advanced search with multiple operators (LIKE, IN, BETWEEN, etc.)
- 📄 Full pagination with metadata (total pages, hasNext, hasPrev)
- 📊 Aggregate functions (min, max, avg, sum) with grouping
- 🔎 Full-text search with relevance scoring
- 💾 Upsert functionality (insert or update on conflict)
- 🔄 Batch update operations with transactions
- ⚡ Conditional updates and deletes (updateWhere, deleteWhere)
- 🎣 Lifecycle hooks (before/after operations)
- 🔙 insertAndReturn method for immediate feedback
- 🔧 Advanced select with complex options (groupBy, having, whereRaw)
- 🛠️ Database utility methods (getTableSchema, getTableIndexes, healthCheck)
- 📈 Cache management (clearCache, getCacheStats)
- 🔒 Raw query execution with safety checks (dangerous keyword detection)
- 🔢 Increment/Decrement operations
- 🎯 distinctValues method
- 🤝 Multi-table joins with aliases
- 📦 Bulk insert operations

#### Changed
- 🚀 Enhanced configuration options
- 🐛 Improved error handling and logging
- ⚡ Better performance monitoring (slow query deACtection)
- 📝 More flexible select options

#### Security
- 🛡️ Added dangerous SQL keyword detection in raw queries
- ✅ Enhanced input validation
- 🔐 Parameterized queries throughout

---

### [1.0.0] - Initial Release

#### Initial Features
- ✅ Basic CRUD operations
- 🔄 Transaction support
- 🗑️ Soft deletes
- ⏰ Auto timestamps
- 📝 Audit logging
- 🔗 Multi-table joins

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup
```bash
git clone https://github.com/yourusername/mysql-db-helper.git
cd mysql-db-helper
npm install
npm test
```

---

## 📄 License

MIT License - see LICENSE file for details

---

## 💡 Tips and Tricks

### 1. Combining Multiple Searches
```javascript
// Use advancedSearch for complex filters
const users = await db.advancedSearch('users', {
  age: { operator: 'BETWEEN', value: { min: 18, max: 65 } },
  country: { operator: 'IN', value: ['US', 'UK', 'CA'] },
  email_verified: { operator: 'IS NOT NULL' },
  status: 'active'
}, {
  orderBy: [{ column: 'created_at', direction: 'DESC' }],
  limit: 50
});
```

### 2. Efficient Data Loading
```javascript
// Load related data in one query instead of N+1
const postsWithAuthors = await db.join({
  baseTable: 'posts',
  joinTable: 'users',
  baseKey: 'author_id',
  joinKey: 'id',
  columns: ['posts.*', 'users.name as author_name']
});
```

### 3. Building Dynamic Queries
```javascript
const buildUserQuery = (filters) => {
  const criteria = {};
  
  if (filters.minAge) {
    criteria.age = { operator: '>=', value: filters.minAge };
  }
  
  if (filters.status) {
    criteria.status = filters.status;
  }
  
  if (filters.roles && filters.roles.length) {
    criteria.role = { operator: 'IN', value: filters.roles };
  }
  
  return db.advancedSearch('users', criteria);
};
```

### 4. Optimizing Large Inserts
```javascript
// For very large datasets, batch them
const batchSize = 1000;
for (let i = 0; i < largeArray.length; i += batchSize) {
  const batch = largeArray.slice(i, i + batchSize);
  await db.bulkInsert('records', batch);
}
```

### 5. Using Hooks for Validation
```javascript
db.addHook('before', 'insert', async (data) => {
  if (data.table === 'users') {
    // Validate email format
    if (!isValidEmail(data.data.email)) {
      throw new Error('Invalid email format');
    }
    
    // Check for duplicates
    const exists = await db.exists('users', { email: data.data.email });
    if (exists) {
      throw new Error('Email already exists');
    }
  }
  return data;
});
```

---

## ⚠️ Common Pitfalls

### 1. Not Including Tables in Allowed List
```javascript
// ❌ Wrong - table not in allowed list
const db = createDb(pool, ['users']);
await db.query('SELECT * FROM posts'); // Error!

// ✅ Correct
const db = createDb(pool, ['users', 'posts']);
await db.query('SELECT * FROM posts'); // Works!
```

### 2. Forgetting to Use Transactions
```javascript
// ❌ Wrong - operations not atomic
await db.insert('orders', orderData);
await db.updateById('products', productId, { stock: newStock }); // If this fails, order is already created!

// ✅ Correct
await db.transaction(async () => {
  await db.insert('orders', orderData);
  await db.updateById('products', productId, { stock: newStock });
});
```

### 3. Not Handling Null Results
```javascript
// ❌ Wrong - will crash if user not found
const user = await db.findOne('users', { id: userId });
console.log(user.name); // TypeError if user is null

// ✅ Correct
const user = await db.findOne('users', { id: userId });
if (user) {
  console.log(user.name);
} else {
  console.log('User not found');
}
```

### 4. Loading Too Much Data at Once
```javascript
// ❌ Wrong - loads all records
const allUsers = await db.selectWhere('users', {});

// ✅ Correct - use pagination
const { data, pagination } = await db.paginate('users', { page: 1, perPage: 50 });
```

---

## 📚 Additional Resources

- [MySQL 2 Documentation](https://github.com/sidorares/node-mysql2)
- [SQL Best Practices](https://www.sqlstyle.guide/)
- [Database Design Principles](https://www.guru99.com/database-design.html)

---

## 🙋 FAQ

**Q: Can I use this with other databases like PostgreSQL?**  
A: No, this library is specifically designed for MySQL. For PostgreSQL, consider using a different library.

**Q: Does this support connection pooling?**  
A: Yes! You pass a connection pool when creating the db instance. The library uses this pool for all queries.

**Q: How do I handle soft deletes in queries?**  
A: Add a WHERE condition to filter out soft-deleted records:
```javascript
const activeUsers = await db.selectWhere('users', { deleted_at: null });
```

**Q: Can I disable auto timestamps for specific tables?**  
A: Timestamps are applied globally. Create separate db instances with different configs if needed.

**Q: Is this production-ready?**  
A: Yes! The library includes error handling, transaction support, query validation, and performance monitoring.

**Q: How do I optimize slow queries?**  
A: 
- Add database indexes on frequently queried columns
- Use `select()` with specific columns instead of `SELECT *`
- Enable caching for read-heavy operations
- Use pagination for large datasets

**Q: Can I use raw SQL queries?**  
A: Yes, use `db.raw()` for custom queries, but note that dangerous keywords are blocked for safety.

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/mysql-db-helper/issues)
- **Documentation**: [Full Docs](https://github.com/yourusername/mysql-db-helper/wiki)
- **Email**: support@example.com

---

## 🌟 Show Your Support

If this library helped you, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 📖 Improving documentation
- 🔀 Contributing code

---

**Made with ❤️ by developers, for developers**