Absolutely — here’s your **final polished and production-ready `README.md`** for your `mysql2-helper-lite` package, with everything included:

✅ Clear intro  
✅ Features list  
✅ Install instructions  
✅ Full usage examples  
✅ Method reference  
✅ Author + License  
✅ Contribution section  

---

```markdown
# 🚀 mysql2-helper-lite

> A lightweight, developer-friendly helper for working with `mysql2/promise` in Node.js. This package simplifies your SQL queries, eliminates boilerplate, and gives you full control of raw SQL + structured helpers.

---

## 📦 What is this?

Working with `mysql2/promise` is powerful — but repetitive.

Instead of doing this:

```js
const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', ['john@example.com']);
const user = rows[0];
```

You can just:

```js
const user = await db.getOne('SELECT * FROM users WHERE email = ?', ['john@example.com']);
```

✅ Less boilerplate  
✅ Cleaner syntax  
✅ Object-based inserts/updates  
✅ Built-in joins, timestamps, soft deletes, audit logging  
✅ Plug-and-play Express route generator

---

## 🚀 Features

- 🔹 `query()` – Run raw SQL
- 🔹 `getOne()` – Get first row or `null`
- 🔹 `insert()` / `bulkInsert()` – Insert from object(s)
- 🔹 `updateById()` – Update row by ID
- 🔹 `deleteById()` – Soft/hard delete
- 🔹 `selectWhere()` – Object-based filtering
- 🔹 `getByIds()` – Get rows by ID list
- 🔹 `count()` / `exists()` – Check row count or presence
- 🔹 `increment()` / `decrement()` – Modify numeric fields
- 🔹 `distinctValues()` – Get unique column values
- 🔹 `search()` – Fuzzy search across fields
- 🔹 `join()` / `multiJoin()` – JOINs, including FULL OUTER
- 🔹 `transaction()` – Wrap logic in SQL transaction
- 🔹 `logAudit()` – Write to audit logs
- 🔹 `generateCrudRoutes()` – Auto REST routes with Express

---

## 🧰 Installation

Make sure you have `mysql2` installed:

```bash
npm install mysql2
```

Then install this package:

```bash
npm install mysql2-helper-lite
```

---

## ⚙️ Setup

```js
const mysql = require('mysql2/promise');
const { createDb, generateCrudRoutes } = require('mysql2-helper-lite');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'your_database'
});

const db = createDb(pool, ['users', 'audit_logs'], { useTimestamps: true });
```

---

## 💡 Usage Examples

### 🔹 Insert a record

```js
const userId = await db.insert('users', {
  name: 'Ranak',
  email: 'ranak@example.com'
});
```

### 🔹 Get one record

```js
const user = await db.getOne('SELECT * FROM users WHERE id = ?', [userId]);
```

### 🔹 Update by ID

```js
await db.updateById('users', userId, { name: 'Ranak Updated' });
```

### 🔹 Delete (soft or hard)

```js
await db.deleteById('users', userId);         // Soft delete
await db.deleteById('users', userId, false);  // Hard delete
```

### 🔹 Select with dynamic WHERE

```js
const admins = await db.selectWhere('users', {
  role: 'admin',
  status: 'active'
});
```

### 🔹 Auto REST API (Express)

```js
generateCrudRoutes(app, 'users', db);
```

---

## 🔄 Traditional vs Helper Comparison

| Operation         | Traditional MySQL2                   | With mysql2-helper-lite     |
|-------------------|---------------------------------------|-----------------------------|
| Insert            | Write full INSERT + bindings          | `db.insert('users', data)` |
| Get One           | `rows[0]` manually                    | `db.getOne(...)`            |
| Update            | Build SET and WHERE manually          | `db.updateById(...)`        |
| Delete            | Write DELETE manually                 | `db.deleteById(...)`        |
| Select Where      | Build WHERE string + bindings         | `db.selectWhere(...)`       |

---

## 🧪 Full Example

```js
const mysql = require('mysql2/promise');
const { createDb, generateCrudRoutes } = require('mysql2-helper-lite'); // adjust path if testing locally

(async () => {
  const pool = await mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // your password
    database: 'test_db',
    waitForConnections: true,
    connectionLimit: 10
  });

  const db = createDb(pool, ['users', 'audit_logs'], { useTimestamps: true });

  console.log('\n🚀 Starting DB Helper Tests...\n');

  // Cleanup
  await db.truncate('users');
  console.log('✅ Truncated users');

  // Insert
  const userId = await db.insert('users', {
    name: 'Alice',
    email: 'alice@example.com',
    age: 25
  });
  console.log('✅ Inserted user:', userId);

  // Bulk insert
  await db.bulkInsert('users', [
    { name: 'Bob', email: 'bob@example.com', age: 30 },
    { name: 'Charlie', email: 'charlie@example.com', age: 22 }
  ]);
  console.log('✅ Bulk inserted users');

  // Select where
  const users = await db.selectWhere('users', { age: 30 });
  console.log('✅ Users age 30:', users);

  // Find one
  const found = await db.findOne('users', { name: 'Alice' });
  console.log('✅ Found Alice:', found);

  // Exists
  const exists = await db.exists('users', { email: 'bob@example.com' });
  console.log('✅ Bob exists?', exists);

  // Get by IDs
  const list = await db.getByIds('users', [userId]);
  console.log('✅ Get by IDs:', list);

  // Count
  const count = await db.count('users');
  console.log('✅ Count users:', count);

  // Update by ID
  await db.updateById('users', userId, { age: 26 });
  const updated = await db.findOne('users', { id: userId });
  console.log('✅ Updated user age:', updated.age);

  // Increment / Decrement
  await db.increment('users', userId, 'age');
  await db.decrement('users', userId, 'age', 2);
  const changedAge = await db.findOne('users', { id: userId });
  console.log('✅ Final age (after +/-):', changedAge.age);

  // Distinct
  const distinctAges = await db.distinctValues('users', 'age');
  console.log('✅ Distinct ages:', distinctAges.map(d => d.age));

  // Search
  const searchResults = await db.search('users', ['name', 'email'], 'bob');
  console.log('✅ Search for "bob":', searchResults);

  // Soft delete
  await db.deleteById('users', userId, true);
  const softDeleted = await db.findOne('users', { id: userId });
  console.log('✅ Soft deleted user:', softDeleted);

  // Hard delete
  await db.deleteById('users', userId, false);
  const hardDeleted = await db.findOne('users', { id: userId });
  console.log('✅ Hard deleted user (should be null):', hardDeleted);

  // Join
  const joined = await db.join({
    baseTable: 'users',
    joinTable: 'audit_logs',
    baseKey: 'id',
    joinKey: 'user_id',
    columns: ['users.name', 'audit_logs.action'],
    joinType: 'LEFT',
    conditions: {}
  });
  console.log('✅ Joined users + audit_logs:', joined);

  // Transaction
  try {
    await db.transaction(async (conn) => {
      await conn.query(`INSERT INTO users (name, email, age, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())`, ['TX', 'tx@example.com', 33]);
      throw new Error('Rollback test');
    });
  } catch (e) {
    console.log('✅ Transaction rolled back correctly');
  }

  // Audit log
  await db.logAudit('test', 'users', { userId: 123 }, 99);
  const logs = await db.selectWhere('audit_logs');
  console.log('✅ Audit logs:', logs);

  console.log('\n✅ All tests completed successfully!\n');

  await pool.end();
})();

```

---

## 📘 Full API Reference

### 🔹 Core Queries
- `query(sql, params)`
- `getOne(sql, params)`

### 🔹 Inserts / Updates
- `insert(table, data)`
- `bulkInsert(table, dataArray)`
- `updateById(table, id, data, idField = 'id')`

### 🔹 Deletion
- `deleteById(table, id, soft = false, idField = 'id')`
- `truncate(table)`

### 🔹 Select & Filters
- `selectWhere(table, conditions, options)`
- `findOne(table, conditions)`
- `getByIds(table, ids, idField)`
- `count(table, conditions)`
- `exists(table, conditions)`

### 🔹 Math Fields
- `increment(table, id, field, amount, idField)`
- `decrement(table, id, field, amount, idField)`

### 🔹 Utilities
- `distinctValues(table, column)`
- `search(table, fields, keyword)`
- `transaction(callback)`
- `logAudit(action, table, data, userId)`

### 🔹 Join Support
- `join({ baseTable, joinTable, baseKey, joinKey, ... })`
- `multiJoin({ baseTable, joins, columns, conditions })`

---
 Features
🔹 query() – Run raw SQL

🔹 getOne() – Get first row or null

🔹 insert() / bulkInsert() – Insert from object(s)

🔹 updateById() – Update row by ID

🔹 deleteById() – Soft/hard delete

🔹 selectWhere() – Object-based filtering

🔹 getByIds() – Get rows by ID list

🔹 count() / exists() – Check row count or presence

🔹 increment() / decrement() – Modify numeric fields

🔹 distinctValues() – Get unique column values

🔹 search() – Fuzzy search across fields

🔹 join() / multiJoin() – JOINs, including FULL OUTER

🔹 transaction() – Wrap logic in SQL transaction

🔹 logAudit() – Write to audit logs

🔹 generateCrudRoutes() – Auto REST routes with Express


## 📚 Available Methods

Here’s a full list of all available functions included in `mysql2-helper-lite`:

| Category       | Method Name              | Description                                      |
|----------------|---------------------------|--------------------------------------------------|
| 🔹 Core         | `query(sql, params)`     | Run raw SQL and return all rows                 |
|                | `getOne(sql, params)`    | Return the first row (or `null` if none)        |
| 🔹 Insert/Update| `insert(table, data)`    | Insert a row using an object                    |
|                | `bulkInsert(table, dataArray)` | Insert multiple rows at once              |
|                | `updateById(table, id, data, idField)` | Update by ID using object            |
| 🔹 Delete       | `deleteById(table, id, soft, idField)` | Soft/hard delete by ID              |
|                | `truncate(table)`        | Truncate (clear) the entire table               |
| 🔹 Select       | `selectWhere(table, conditions, options)` | Dynamic WHERE from object         |
|                | `findOne(table, conditions)` | Get the first row matching conditions       |
|                | `getByIds(table, ids, idField)` | Get rows by array of IDs                  |
|                | `count(table, conditions)` | Count rows based on filter                  |
|                | `exists(table, conditions)` | Check if at least one matching row exists   |
| 🔹 Math Ops     | `increment(table, id, field, amount, idField)` | Increment numeric field           |
|                | `decrement(table, id, field, amount, idField)` | Decrement numeric field           |
| 🔹 Utilities    | `distinctValues(table, column)` | Get unique values in a column           |
|                | `search(table, fields, keyword)` | LIKE search on multiple fields          |
|                | `transaction(callback)` | Execute logic in a SQL transaction block       |
|                | `logAudit(action, table, data, userId)` | Log changes to `audit_logs` table     |
| 🔹 Joins        | `join({...})`            | Basic JOIN between two tables                  |
|                | `multiJoin({...})`       | Advanced multi-table JOIN (incl. FULL OUTER)   |



Nlet's walk through **how to test your RESTful APIs** generated via `generateCrudRoutes()` from your `mysql2-helper-lite` package.

---

## ✅ What It Does (Recap)

When you call:

```js
generateCrudRoutes(app, 'users', db);
```

It generates the following REST endpoints for the `users` table:

| Method | Route          | Action                |
|--------|----------------|------------------------|
| GET    | `/users`       | Get all users         |
| GET    | `/users/:id`   | Get one user by ID    |
| POST   | `/users`       | Insert new user       |
| PUT    | `/users/:id`   | Update user by ID     |
| DELETE | `/users/:id`   | Soft delete user by ID|

> ⚠️ You must have `'users'` in your `allowedTables` array when calling `createDb`.

---


```js
const express = require('express');
const mysql = require('mysql2/promise');
const { createDb, generateCrudRoutes } = require('mysql2-helper-lite');

const app = express();
app.use(express.json());

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'test_db'
});

const db = createDb(pool, ['users'], { useTimestamps: true });

generateCrudRoutes(app, 'users', db);

app.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));
```

---

## ✅ 2. Start the Server

```bash
node your-test-file.js
```

---

## ✅ 3. Test the API (via Postman, curl, or browser)

### ➕ Create a user

```http
POST http://localhost:3000/users
Content-Type: application/json

{
  "name": "Ranak",
  "email": "ranak@example.com"
}
```

### 📥 Get all users

```http
GET http://localhost:3000/users
```

### 🔍 Get one user

```http
GET http://localhost:3000/users/1
```

### ✏️ Update user

```http
PUT http://localhost:3000/users/1
Content-Type: application/json

{
  "name": "Updated Name"
}
```

### 🗑️ Soft delete user

```http
DELETE http://localhost:3000/users/1
```

---

## 🧪 Optional: Add More Tables

```js
generateCrudRoutes(app, 'posts', db);
generateCrudRoutes(app, 'products', db);
```

As long as those tables exist and are listed in `allowedTables`, the routes will be ready.

---



## 🧪 REST API Support

Generate full CRUD endpoints automatically:

```js
generateCrudRoutes(app, 'users', db);
```

Creates:

- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`




## 🧑‍💻 Author

**Ranak Debnath**  
📧 [piyaldeb87@gmail.com](mailto:piyaldeb87@gmail.com)  
🐙 GitHub: [@piyaldeb](https://github.com/piyaldeb)

---

## 📄 License

MIT — free to use, modify, and distribute.

---

## 🙌 Contributions

PRs, ideas, and improvements are welcome!  
If you like the project, give it a ⭐️ on GitHub.

---

```

---

