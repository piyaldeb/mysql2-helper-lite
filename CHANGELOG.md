# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.0] - 2025-11-11

### 🎉 Major Release - Revolutionary Features Beyond mysql2!

This is a major release introducing **16 creative functions** that go far beyond what's available in standard mysql2, plus critical bug fixes and performance improvements.

### ✨ Added - Creative Functions (Not in mysql2)

#### Data Comparison & Analysis
- **`diff(table, id1, id2, idField)`** - Smart comparison showing only changed fields between two records
  - Perfect for audit trails and change detection
  - Returns object with `{ field: { from: oldValue, to: newValue } }`

#### Advanced Update Operations
- **`bulkConditionalUpdate(table, updates)`** - Update multiple records with different conditions in one transaction
  - Atomic batch updates with varied conditions
  - Returns total affected rows

#### Temporal & Historical Queries
- **`timeTravel(table, timestamp, where)`** - Query records as they existed at a specific point in time
  - Historical data analysis
  - Compliance and debugging support

#### Data Fusion & Merging
- **`smartMerge(tables, commonKey, keyValue)`** - Intelligently merge data from multiple tables
  - Automatic table joining based on common keys
  - Source tracking with `_source_tableName` fields

#### Intelligent Search
- **`fuzzySearch(table, field, searchTerm, maxScore)`** - Approximate matching with relevance scoring
  - Typo-tolerant search
  - Match scores: 0 (exact), 1 (starts with), 2 (contains), 3 (no match)

#### Probability & Random Selection
- **`weightedRandom(table, weightColumn, count, where)`** - Random selection with weighted probability
  - Featured content selection
  - A/B testing with weights
  - Advertisement rotation

#### Functional Programming
- **`batchTransform(table, transformFn, where, batchSize)`** - Apply transformation functions to all records
  - Process records in chunks
  - Perfect for data migrations and ETL
  - Returns count of processed records

#### Backup & Recovery
- **`snapshot(table, snapshotName)`** - Create instant backup snapshots of tables
  - Pre-migration safety
  - Quick rollback capability
  - Returns snapshot metadata

#### Version Control
- **`createVersion(table, id, userId, idField)`** - Automatic record versioning system
  - Full change history tracking
  - Audit trails and compliance
  - Undo functionality support

#### Advanced Aggregations
- **`conditionalAggregate(table, aggregations, where)`** - Aggregate with conditional logic (CASE WHEN)
  - Multiple conditional aggregates in one query
  - Dashboard metrics and BI reporting
  - Example: Sum completed vs pending orders simultaneously

#### Ranking & Leaderboards
- **`rank(table, rankColumn, options)`** - Rank records using RANK() and DENSE_RANK() window functions
  - Partition-based ranking
  - Tie handling with dense_rank
  - Perfect for leaderboards and top-N queries

#### Time Series Analysis
- **`movingAverage(table, valueColumn, dateColumn, windowSize, where)`** - Calculate moving averages
  - Trend analysis for financial data
  - Sales forecasting
  - Performance monitoring over time

#### Data Quality
- **`findDuplicates(table, compareFields)`** - Intelligent duplicate detection
  - Multi-field comparison
  - Returns duplicate counts and IDs
  - Data cleaning and deduplication

#### Cache Optimization
- **`warmCache(table, queries)`** - Pre-load frequently accessed data
  - Application startup optimization
  - Peak traffic preparation
  - Predictive caching
  - Returns cache statistics

#### Relational Operations
- **`cascadeUpdate(table, id, data, relations, idField)`** - Update record and all related records atomically
  - Transactional cascade updates
  - Status propagation across tables
  - Data consistency enforcement

#### Performance Analytics
- **`queryStats(table, options)`** - Analyze query performance and table statistics
  - Record counts and growth patterns
  - Average row size calculation
  - Data distribution analysis

### 🐛 Fixed - Critical Bug Fixes

#### SQL Query Issues
- **Fixed deprecated median calculation** (lines 1151-1176 in index.js)
  - Updated to MySQL 8.0+ compatible CTE and window functions
  - Replaced deprecated `@rownum` variable approach
  - Now uses `WITH` clause and `ROW_NUMBER() OVER`

#### Dependency Management
- **Added missing `sqlstring` dependency** in package.json
  - Required by line 1 in index.js
  - Prevents runtime "module not found" errors

#### Security Enhancements
- **Enhanced SQL injection protection** in `raw()` method (lines 1513-1525)
  - Uses regex word boundaries (`\b`) for keyword detection
  - Prevents bypass with mixed case or word-embedded keywords
  - More robust dangerous keyword detection

#### Validation Improvements
- **Added validation for increment/decrement operations** (lines 564-584)
  - Validates amount is a valid number
  - Throws error for NaN or non-numeric values
  - Returns `affectedRows` count instead of raw query result

### 🔧 Changed - Improvements

#### Return Values
- **`increment()` and `decrement()`** now return `affectedRows` count
  - Better feedback for atomic operations
  - Consistent with other update methods

#### Code Quality
- Fixed unused variable warnings
- Improved error messages
- Better type consistency
- Enhanced code documentation

### 📚 Documentation

- Complete README rewrite with 800+ lines of examples
- Detailed documentation for all 16 new creative functions
- Real-world use cases for e-commerce, analytics, and CMS
- Migration guides and best practices
- Performance optimization tips
- Security features explained

### ⚠️ Breaking Changes

**None!** All existing functionality remains fully backward compatible.

---

## [5.0.0] - 2025-11-06

### 🎉 Major Release - Next-Gen Database Helper

### Added

**Bulk Operations**
- `bulkInsertAndReturn()` – Insert multiple records and return them
- `bulkUpsert()` – Bulk insert or update on conflict
- `batchDelete()` – Delete multiple records by IDs (supports soft delete)

**Smart CRUD Helpers**
- `updateByIdAndReturn()` – Update and return updated record
- `findOrCreate()` – Find existing record or create new one
- `findOneAndUpdate()` – Find and update in one operation
- `findOneAndDelete()` – Find and delete in one operation

**Advanced Pagination**
- `cursorPaginate()` – Cursor-based pagination for large datasets

**Record Utilities**
- `first()` / `last()` – Get first or last record
- `random()` – Get random record(s)
- `clone()` – Clone or duplicate a record
- `isDuplicate()` – Check for duplicate records

**Soft Delete Enhancements**
- `restore()` / `restoreWhere()` – Restore soft-deleted records
- `onlyTrashed()` – Retrieve only deleted records
- `withTrashed()` – Retrieve all including deleted

**JSON Column Operations**
- `jsonExtract()` – Extract data from JSON columns
- `jsonContains()` – Search within JSON columns

**Date/Time Queries**
- `whereDateBetween()` – Query between date ranges
- `whereDate()` / `whereYear()` / `whereMonth()` / `whereDay()` – Filter by date components
- `createdToday()` / `createdThisWeek()` / `createdThisMonth()` / `createdThisYear()` – Quick time-based filters

**Statistical Functions**
- `median()` – Calculate median values
- `percentile()` – Compute percentile results
- `countBy()` – Count grouped records
- `groupConcat()` – Concatenate grouped field values

**Query Builder Methods**
- `whereIn()` / `whereNotIn()` – IN and NOT IN filters
- `whereBetween()` / `whereNotBetween()` – BETWEEN filters
- `whereNull()` / `whereNotNull()` – Null value checks
- `whereGreaterThan()` / `whereLessThan()` – Comparison filters
- `whereStartsWith()` / `whereEndsWith()` / `whereContains()` – String pattern filters
- `whereLike()` – Case-sensitive or insensitive LIKE queries

**Relationship Helpers**
- `hasOne()` – One-to-one relationship
- `hasMany()` – One-to-many relationship
- `belongsTo()` – Inverse relation of hasMany
- `belongsToMany()` – Many-to-many relationship with pivot tables

**Data Processing**
- `pluck()` – Get array of specific column values
- `pivotTable()` – Build Excel-style pivot summaries
- `chunk()` – Process large datasets in chunks
- `incrementMany()` / `decrementMany()` – Update multiple numeric fields at once

**Database Management**
- `getTableInfo()` – Table size, row count, and storage info
- `listTables()` – List all tables in database
- `tableExists()` – Check if table exists
- `optimizeTable()` – Optimize table performance
- `analyzeTable()` – Analyze table for optimization
- `getDatabaseStats()` – Get database-wide statistics
- `getPoolInfo()` – Get connection pool metrics
- `rawUnsafe()` – Execute raw SQL without keyword restrictions

### Changed

- Optimized caching mechanism with faster invalidation
- Improved transaction safety and rollback reliability
- Enhanced hook execution for async lifecycle handling
- Better performance logging for long-running queries
- Simplified CRUD naming for consistency

### Security

- Strengthened validation for bulk and batch operations
- Safer raw SQL execution with `rawUnsafe()` opt-in
- Improved parameter sanitization across all methods

---

## [4.0.0] - 2024-11-05

### 🎉 Major Release - Powerful New Features

### Added
- Query caching system with automatic invalidation
- Advanced search with multiple operators (LIKE, IN, BETWEEN, etc.)
- Full pagination with metadata (total pages, hasNext, hasPrev)
- Aggregate functions (min, max, avg, sum) with grouping
- Full-text search with relevance scoring
- Upsert functionality (insert or update on conflict)
- Batch update operations
- Conditional updates and deletes
- Lifecycle hooks (before/after operations)
- `insertAndReturn` method
- `updateWhere` and `deleteWhere` methods
- Advanced select with complex options
- Database utility methods (getTableSchema, getTableIndexes, healthCheck)
- Cache management (clearCache, getCacheStats)
- Raw query execution with safety checks

### Changed
- Enhanced configuration options
- Improved error handling
- Better performance monitoring

### Security
- Added dangerous SQL keyword detection
- Enhanced input validation

---

## [3.0.0] - 2024-09-15

### Added
- Connection pooling support
- Transaction improvements
- Better error messages

---

## [2.0.0] - 2024-07-20

### Added
- Soft delete functionality
- Timestamp management
- Basic hooks system

---

## [1.0.0] - 2024-06-01

### Initial Release

#### Features
- Basic CRUD operations
- Transaction support
- Soft deletes
- Auto timestamps
- Audit logging
- Multi-table joins

---

## Upgrade Guide

### Upgrading to 6.0.0 from 5.x

**No breaking changes!** All existing code will work as-is. New functions are purely additive.

To use new features:
```javascript
// All new functions are immediately available
const changes = await db.diff('users', 1, 2);
const snapshot = await db.snapshot('users', 'backup_2025');
const ranked = await db.rank('users', 'score', { limit: 10 });
```

### Upgrading to 5.0.0 from 4.x

Minor adjustments may be needed for advanced features. Basic CRUD remains unchanged.

---

## Migration Tips

### Using New Creative Functions

```javascript
// Replace manual comparison logic
const changes = await db.diff('users', oldId, newId);

// Pre-load cache on startup
await db.warmCache('products', [
  { where: { featured: true } },
  { where: { best_seller: true } }
]);

// Find and merge duplicate customers
const dupes = await db.findDuplicates('customers', ['email', 'phone']);
for (const dupe of dupes) {
  const merged = await db.smartMerge(['customers', 'profiles'], 'id', dupe.ids[0]);
  // Handle merge...
}
```

---

## Support

For issues, questions, or feature requests:
- **GitHub Issues**: https://github.com/piyaldeb/mysql2-helper-lite/issues
- **Email**: piyaldeb87@gmail.com
- **Documentation**: See README.md for comprehensive guides

---

**Thank you for using mysql2-helper-lite!** ❤️
