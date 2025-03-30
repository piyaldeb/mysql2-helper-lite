# mysql2-helper-lite

A lightweight helper for working with `mysql2/promise` in Node.js — fewer lines, cleaner code.

## 🚀 Features
- `query()`
- `getOne()`
- `insert()`
- `updateById()`
- `deleteById()`
- `selectWhere()`

## 🧱 Example

```js
const db = require('mysql2-helper-lite');

const userId = await db.insert('users', {
  name: 'Ranak',
  email: 'ranak@example.com'
});

const user = await db.getOne('SELECT * FROM users WHERE user_id = ?', [userId]);

await db.updateById('users', userId, { name: 'Updated Name' });

await db.deleteById('users', userId);


---

```markdown
# mysql2-helper-lite

> A lightweight, developer-friendly helper for working with `mysql2/promise` in Node.js. This package simplifies your SQL queries and helps you avoid repetitive boilerplate, while giving you full control of your database logic.

---

## 📦 What is this?

Working with `mysql2/promise` is powerful, but often repetitive:

```js
const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', ['john@example.com']);
const user = rows[0];
```

With **mysql2-helper-lite**, you just write:

```js
const user = await db.getOne('SELECT * FROM users WHERE email = ?', ['john@example.com']);
```

✅ Less boilerplate  
✅ Cleaner syntax  
✅ Full control over raw SQL  
✅ Centralized query utilities  

---

## 🚀 Features

- `query(sql, params)` – standard SELECT query
- `getOne(sql, params)` – returns the first result or null
- `insert(table, data)` – object-based insert
- `updateById(table, id, data, idField = 'id')` – update row by ID
- `deleteById(table, id, idField = 'id')` – delete row by ID
- `selectWhere(table, conditions)` – build dynamic WHERE clauses from objects

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
const createDbHelper = require('mysql2-helper-lite');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'your_database'
});

const db = createDbHelper(pool);
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
const user = await db.getOne('SELECT * FROM users WHERE user_id = ?', [userId]);
console.log(user);
```

### 🔹 Update a record by ID

```js
await db.updateById('users', userId, {
  name: 'Ranak Updated',
  status: 'active'
}, 'user_id');
```

### 🔹 Delete a record by ID

```js
await db.deleteById('users', userId, 'user_id');
```

### 🔹 Select with dynamic WHERE

```js
const activeAdmins = await db.selectWhere('users', {
  role: 'admin',
  status: 'active'
});
console.log(activeAdmins);
```

---

## 🔄 Traditional vs Helper Comparison

| Operation      | Traditional MySQL2                                  | With `mysql2-helper-lite`                         |
|----------------|------------------------------------------------------|---------------------------------------------------|
| Insert         | Manually write query & values                        | `db.insert('users', data)`                        |
| Get One        | Write query, access `rows[0]`                        | `db.getOne(...)`                                  |
| Update         | Write `SET column = ?` manually                      | `db.updateById('users', id, data)`                |
| Delete         | Write full delete query                              | `db.deleteById('users', id)`                      |
| Select Where   | Manually build WHERE clause                          | `db.selectWhere('users', { role: 'admin' })`      |

---

## 🧪 Full Example

```js
const mysql = require('mysql2/promise');
const createDbHelper = require('mysql2-helper-lite');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'test_db'
});

const db = createDbHelper(pool);

(async () => {
  const id = await db.insert('users', {
    name: 'John Doe',
    email: 'john@example.com'
  });

  const user = await db.getOne('SELECT * FROM users WHERE user_id = ?', [id]);
  console.log(user);

  await db.updateById('users', id, { name: 'Updated Name' });

  const admins = await db.selectWhere('users', { role: 'admin' });
  console.log(admins);

  await db.deleteById('users', id);
})();
```

---

## 📄 API Reference

### db.query(sql, params)
Executes a raw SQL query and returns all rows.

### db.getOne(sql, params)
Executes a SQL query and returns the first row (or `null` if none found).

### db.insert(table, data)
Inserts an object as a new row in the specified table.
Returns the inserted row's ID.

### db.updateById(table, id, data, idField = 'id')
Updates a row by its ID using an object.

### db.deleteById(table, id, idField = 'id')
Deletes a row by ID.

### db.selectWhere(table, conditions)
Builds a `WHERE` clause from a JS object and runs the `SELECT`.

---

## 🧑‍💻 Author

**Ranak Debnath**  
📧 piyaldeb87@gmail.com  
🐙 GitHub: [@piyaldeb]((https://github.com/piyaldeb))

---

## 📄 License

MIT

---

## 🙌 Contributions

PRs and issues are welcome! Help improve this package by contributing ideas, fixes, or new features.
```

