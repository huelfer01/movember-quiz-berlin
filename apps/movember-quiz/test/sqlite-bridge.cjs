// Jest's resolver predates node:sqlite. This is the real Node module, not a mock DB.
exports.DatabaseSync = process.getBuiltinModule('node:sqlite').DatabaseSync;
