import DatabaseManager from '../../db/database.js';
import LLMSuggestionService from './llm-suggestion-service.js';
import ReviewService from './review-service.js';
import MemoryService from './memory-service.js';
import { registerDatabaseHandlers } from './ipc-handlers/database-handlers.js';
import { registerLLMHandlers } from './ipc-handlers/llm-handlers.js';
import { registerSuggestionHandlers } from './ipc-handlers/suggestion-handlers.js';
import { registerReviewHandlers } from './ipc-handlers/review-handlers.js';
import { registerMemoryHandlers } from './ipc-handlers/memory-handlers.js';

export class IPCManager {
  registerHandlers(ipcMain, options = {}) {
    this.db = new DatabaseManager(options);
    this.llmSuggestionService = new LLMSuggestionService(() => this.db);
    this.reviewService = new ReviewService(() => this.db);
    this.memoryService = new MemoryService();
    registerDatabaseHandlers({ ipcMain, db: this.db });
    registerLLMHandlers({ ipcMain, db: this.db });
    registerSuggestionHandlers({ ipcMain, db: this.db, llmSuggestionService: this.llmSuggestionService, ensureSuggestionService: () => {} });
    registerReviewHandlers({ ipcMain, reviewService: this.reviewService });
    registerMemoryHandlers({ ipcMain, memoryService: this.memoryService });
  }
}
