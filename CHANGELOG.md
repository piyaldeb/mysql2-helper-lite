# Changelog

## [3.0.0] - 2024-11-05

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