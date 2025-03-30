Absolutely! Here's your **updated `README.md`** for `mysql2-helper-lite` with all the **new features** included, keeping it clean, professional, and dev-friendly.

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
- `forceDeleteById(table, id, idField = 'id')` – hard delete row (useful for soft-delete systems)
- `selectWhere(table, conditions)` – build dynamic WHERE clauses from objects
- `findOne(table, conditions)` – find one row from table using object-based filter
- `count(table, conditions)` – count matching rows
- `exists(table, conditions)` – check if matching row(s) exist

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

### 🔹 Get one record (SQL style)

```js
const user = await db.getOne('SELECT * FROM users WHERE user_id = ?', [userId]);
```

### 🔹 Find one record (object-based)

```js
const user = await db.findOne('users', { email: 'ranak@example.com' });
```

### 🔹 Update a record by ID

```js
await db.updateById('users', userId, {
  name: 'Ranak Updated',
  status: 'active'
}, 'user_id');
```

### 🔹 Delete a record (by ID)

```js
await db.deleteById('users', userId, 'user_id');
```

### 🔹 Force delete (ignores soft-delete logic)

```js
await db.forceDeleteById('users', userId, 'user_id');
```

### 🔹 Select with dynamic WHERE

```js
const activeAdmins = await db.selectWhere('users', {
  role: 'admin',
  status: 'active'
});
```

### 🔹 Count matching records

```js
const count = await db.count('users', { role: 'admin' });
console.log(`Total admins: ${count}`);
```

### 🔹 Check if a record exists

```js
const exists = await db.exists('users', { email: 'ranak@example.com' });
if (exists) {
  console.log('User exists!');
}
```

---

## 🔄 Traditional vs Helper Comparison

| Operation      | Traditional MySQL2                                  | With `mysql2-helper-lite`                         |
|----------------|------------------------------------------------------|---------------------------------------------------|
| Insert         | Write query & placeholders manually                  | `db.insert('users', data)`                        |
| Get One        | Write query, access `rows[0]`                        | `db.getOne(...)`                                  |
| Find One       | Build WHERE + LIMIT manually                         | `db.findOne('users', { email: '...' })`           |
| Count          | Write custom COUNT query                             | `db.count('users', { role: 'admin' })`            |
| Exists         | Write `EXISTS(SELECT ...)` SQL manually              | `db.exists('users', { status: 'active' })`        |
| Update         | Write SET + WHERE                                    | `db.updateById('users', id, data)`                |
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
    email: 'john@example.com',
    role: 'admin'
  });

  const user = await db.getOne('SELECT * FROM users WHERE user_id = ?', [id]);
  console.log(user);

  const isAdmin = await db.exists('users', { role: 'admin' });

  const totalAdmins = await db.count('users', { role: 'admin' });

  await db.updateById('users', id, { name: 'Updated Name' });

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

### db.forceDeleteById(table, id, idField = 'id')
Hard deletes a row — useful if you're using soft-delete logic in your app.

### db.selectWhere(table, conditions)
Builds a `WHERE` clause from a JS object and runs the `SELECT`.

### db.findOne(table, conditions)
Returns the first row matching object-based conditions (like `.selectWhere`, but with `LIMIT 1`).

### db.count(table, conditions)
Returns the number of matching rows for given conditions.

### db.exists(table, conditions)
Returns `true` if at least one row matches the given conditions.

---

## 👨‍💻 Author

**Ranak Debnath**  
📧 piyaldeb87@gmail.com  
🐙 GitHub: [@piyaldeb](https://github.com/piyaldeb)

---

## 📄 License

MIT

---

## 🙌 Contributions

Pull requests and issues are welcome!  
Help improve this package by contributing ideas, fixes, or new features.
```

---

Let me know if you want:

- A `CHANGELOG.md`
- Version bumping script
- A GitHub repo structure ready for push
- Or to convert this to TypeScript (with typings)

We can turn this into a dev-favorite utility in no time 🔥