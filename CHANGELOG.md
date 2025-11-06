# Changelog

## [5.0.0] - 2025-11-06

### 🎉 Major Release - Next-Gen Database Helper

### Added

* Bulk Operations

  * `bulkInsertAndReturn()` – Insert multiple records and return them
  * `bulkUpsert()` – Bulk insert or update on conflict
  * `batchDelete()` – Delete multiple records by IDs (supports soft delete)

* Smart CRUD Helpers

  * `updateByIdAndReturn()` – Update and return updated record
  * `findOrCreate()` – Find existing record or create new one
  * `findOneAndUpdate()` – Find and update in one operation
  * `findOneAndDelete()` – Find and delete in one operation

* Advanced Pagination

  * `cursorPaginate()` – Cursor-based pagination for large datasets

* Record Utilities

  * `first()` / `last()` – Get first or last record
  * `random()` – Get random record(s)
  * `clone()` – Clone or duplicate a record
  * `isDuplicate()` – Check for duplicate records

* Soft Delete Enhancements

  * `restore()` / `restoreWhere()` – Restore soft-deleted records
  * `onlyTrashed()` – Retrieve only deleted records
  * `withTrashed()` – Retrieve all including deleted

* JSON Column Operations

  * `jsonExtract()` – Extract data from JSON columns
  * `jsonContains()` – Search within JSON columns

* Date/Time Queries

  * `whereDateBetween()` – Query between date ranges
  * `whereDate()` / `whereYear()` / `whereMonth()` / `whereDay()` – Filter by date components
  * `createdToday()` / `createdThisWeek()` / `createdThisMonth()` / `createdThisYear()` – Quick time-based filters

* Statistical Functions

  * `median()` – Calculate median values
  * `percentile()` – Compute percentile results
  * `countBy()` – Count grouped records
  * `groupConcat()` – Concatenate grouped field values

* Query Builder Methods

  * `whereIn()` / `whereNotIn()` – IN and NOT IN filters
  * `whereBetween()` / `whereNotBetween()` – BETWEEN filters
  * `whereNull()` / `whereNotNull()` – Null value checks
  * `whereGreaterThan()` / `whereLessThan()` – Comparison filters
  * `whereStartsWith()` / `whereEndsWith()` / `whereContains()` – String pattern filters
  * `whereLike()` – Case-sensitive or insensitive LIKE queries

* Relationship Helpers

  * `hasOne()` – One-to-one relationship
  * `hasMany()` – One-to-many relationship
  * `belongsTo()` – Inverse relation of hasMany
  * `belongsToMany()` – Many-to-many relationship with pivot tables

* Data Processing

  * `pluck()` – Get array of specific column values
  * `chunk()` – Process large datasets in chunks
  * `incrementMany()` / `decrementMany()` – Update multiple numeric fields at once

* Database Management

  * `getTableInfo()` – Table size, row count, and storage info
  * `listTables()` – List all tables in database
  * `tableExists()` – Check if table exists
  * `optimizeTable()` – Optimize table performance
  * `analyzeTable()` – Analyze table for optimization
  * `getDatabaseStats()` – Get database-wide statistics
  * `getPoolInfo()` – Get connection pool metrics
  * `rawUnsafe()` – Execute raw SQL without keyword restrictions

### Changed

* Optimized caching mechanism with faster invalidation
* Improved transaction safety and rollback reliability
* Enhanced hook execution for async lifecycle handling
* Better performance logging for long-running queries
* Simplified CRUD naming for consistency

### Security

* Strengthened validation for bulk and batch operations
* Safer raw SQL execution with `rawUnsafe()` opt-in
* Improved parameter sanitization across all methods


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
- insertAndReturn method
- updateWhere and deleteWhere methods
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

## [1.0.0] - Previous Date

### Initial Release
- Basic CRUD operations
- Transaction support
- Soft deletes
- Auto timestamps
- Audit logging
- Multi-table joins