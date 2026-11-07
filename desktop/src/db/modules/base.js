import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

import { fileURLToPath } from 'url';

// 获取 __dirname 的 ESM 等效方式
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default class DatabaseBase {
  constructor(options = {}) {
    // The server owns one persistent database. Never silently fall back to a temporary file.
    this.dbPath = path.resolve(options.dbPath || process.env.LIVEGALGAME_DB_PATH || path.join(__dirname, '../../../data/livegalgame.db'));

    // 确保数据库目录存在
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 创建数据库连接
    this.db = new Database(this.dbPath);

    // 启用 WAL 模式以提高性能和并发
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');

    try {
      fs.accessSync(this.dbPath, fs.constants.W_OK);
      console.log('[DB] Using writable database at:', this.dbPath);
    } catch {
      console.warn('[DB] Database path may be read-only:', this.dbPath);
    }

    // 启用外键约束
    this.db.pragma('foreign_keys = ON');

    // 初始化数据库表
    this.initialize();

    console.log('Database initialized at:', this.dbPath);
  }

  // 初始化数据库表
  initialize() {
    console.log('Initializing database schema...');
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // 执行SQL语句（分割并逐条执行）
    const statements = schema.split(';').filter(stmt => stmt.trim());

    // 开始事务
    const transaction = this.db.transaction(() => {
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            this.db.exec(statement);
          } catch (err) {
            const msg = String(err?.message || err);
            const upper = statement.trim().toUpperCase();
            const ignorableIndexError =
              upper.startsWith('CREATE INDEX') &&
              (msg.includes('no such column') || msg.includes('has no column'));
            if (ignorableIndexError) {
              // 兼容老库：表已存在但列还未迁移时，schema.sql 的新索引会失败。后续 ensureSuggestionDecisionSchema 会补齐。
              console.warn('[DB] Ignoring index creation error (will be fixed by migration):', msg);
              continue;
            }
            throw err;
          }
        }
      }
    });

    transaction();
    console.log('Database schema initialized');

    // 预先执行关键迁移，避免 seed.sql 因旧表结构导致插入失败
    try {
      if (typeof this.ensureSuggestionDecisionSchema === 'function') {
        this.ensureSuggestionDecisionSchema();
      }
    } catch (err) {
      console.warn('[DB] ensureSuggestionDecisionSchema failed (will retry lazily on access):', err);
    }

    // 初始化示例数据（如果数据库为空）
    this.seedSampleData();

    // 初始化默认对话建议配置
    if (typeof this.seedDefaultSuggestionConfig === 'function') {
      this.seedDefaultSuggestionConfig();
    }
  }

  // 关闭数据库连接
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}
