const { contextBridge, ipcRenderer } = require('electron');

// Preload 脚本中使用简单的 console 日志
// 注意：在 Electron 的 preload 环境中，某些 Node.js 模块可能不可用
// 因此直接使用 console 而不是加载自定义 logger
const logger = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console)
};

// 由于我们在 `on/once` 中会包一层 listener 来去掉 event 参数，
// 这里维护一个映射，确保 `removeListener` 可以正确移除（避免监听器泄漏/重复触发）
const listenerRegistry = new Map(); // channel -> Map(originalCallback -> wrappedCallback)

function getChannelRegistry(channel) {
  if (!listenerRegistry.has(channel)) {
    listenerRegistry.set(channel, new Map());
  }
  return listenerRegistry.get(channel);
}

function registerWrappedListener(channel, callback, { once = false } = {}) {
  if (typeof channel !== 'string' || typeof callback !== 'function') {
    return () => { };
  }

  const channelMap = getChannelRegistry(channel);
  const existing = channelMap.get(callback);
  if (existing) {
    try {
      ipcRenderer.removeListener(channel, existing);
    } catch {
      // ignore
    }
  }

  const wrapped = (event, ...args) => {
    try {
      callback(...args);
    } finally {
      // once 的 listener 触发后会自动移除，但我们也要清理映射
      if (once) {
        channelMap.delete(callback);
      }
    }
  };

  channelMap.set(callback, wrapped);
  if (once) {
    ipcRenderer.once(channel, wrapped);
  } else {
    ipcRenderer.on(channel, wrapped);
  }

  return () => {
    try {
      const stored = channelMap.get(callback);
      if (!stored) return;
      ipcRenderer.removeListener(channel, stored);
      channelMap.delete(callback);
    } catch {
      // ignore
    }
  };
}

function removeWrappedListener(channel, callback) {
  if (typeof channel !== 'string' || typeof callback !== 'function') {
    return;
  }
  const channelMap = listenerRegistry.get(channel);
  const stored = channelMap?.get(callback);
  if (stored) {
    try {
      ipcRenderer.removeListener(channel, stored);
    } catch {
      // ignore
    }
    channelMap.delete(callback);
    return;
  }
  // 兼容：如果外部传入的就是原生 listener
  try {
    ipcRenderer.removeListener(channel, callback);
  } catch {
    // ignore
  }
}

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 平台信息
  platform: process.platform,

  // IPC通信
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => registerWrappedListener(channel, callback, { once: false }),
  once: (channel, callback) => registerWrappedListener(channel, callback, { once: true }),
  removeListener: (channel, callback) => removeWrappedListener(channel, callback),

  // 日志
  log: (message) => ipcRenderer.send('log', message),

  // 主窗口控制
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  // 窗口拖拽
  startDrag: (pos) => ipcRenderer.send('start-drag', pos),
  updateDrag: (pos) => ipcRenderer.send('update-drag', pos),
  endDrag: () => ipcRenderer.send('end-drag'),

  // 数据库API
  getAllCharacters: () => ipcRenderer.invoke('db-get-all-characters'),
  getCharacterById: (id) => ipcRenderer.invoke('db-get-character-by-id', id),
  createCharacter: (characterData) => ipcRenderer.invoke('db-create-character', characterData),
  dbCreateConversation: (conversationData) => ipcRenderer.invoke('db-create-conversation', conversationData),
  getConversationsByCharacter: (characterId) => ipcRenderer.invoke('db-get-conversations-by-character', characterId),
  dbCreateMessage: (messageData) => ipcRenderer.invoke('db-create-message', messageData),
  getMessagesByConversation: (conversationId) => ipcRenderer.invoke('db-get-messages-by-conversation', conversationId),
  updateConversation: (conversationId, updates) => ipcRenderer.invoke('db-update-conversation', conversationId, updates),
  getStatistics: () => ipcRenderer.invoke('db-get-statistics'),
  getCharacterPageStatistics: () => ipcRenderer.invoke('db-get-character-page-statistics'),
  getRecentConversations: (limit) => ipcRenderer.invoke('db-get-recent-conversations', limit),
  getAllConversations: () => ipcRenderer.invoke('db-get-all-conversations'),
  updateMessage: (messageId, updates) => ipcRenderer.invoke('db-update-message', messageId, updates),
  getConversationAIData: (conversationId) => ipcRenderer.invoke('db-get-conversation-ai-data', conversationId),
  selectActionSuggestion: (payload) => ipcRenderer.invoke('db-select-action-suggestion', payload),
  getCharacterDetails: (characterId) => ipcRenderer.invoke('db-get-character-details', characterId),
  updateCharacterDetailsCustomFields: (characterId, customFields) => ipcRenderer.invoke('db-update-character-details-custom-fields', characterId, customFields),
  regenerateCharacterDetails: (characterId) => ipcRenderer.invoke('db-regenerate-character-details', characterId),
  deleteConversation: (conversationId) => ipcRenderer.invoke('db-delete-conversation', conversationId),
  deleteCharacter: (characterId) => ipcRenderer.invoke('db-delete-character', characterId),

  // Review API
  getConversationById: (conversationId) => ipcRenderer.invoke('db-get-conversation-by-id', conversationId),
  getConversationReview: (conversationId) => ipcRenderer.invoke('review:get', conversationId),
  generateConversationReview: (conversationId, options = {}) =>
    ipcRenderer.invoke('review:generate', { conversationId, ...options }),
  onReviewProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('review:progress', listener);
    return () => ipcRenderer.removeListener('review:progress', listener);
  },

  // LLM配置API
  saveLLMConfig: (configData) => ipcRenderer.invoke('llm-save-config', configData),
  getAllLLMConfigs: () => ipcRenderer.invoke('llm-get-all-configs'),
  getDefaultLLMConfig: () => ipcRenderer.invoke('llm-get-default-config'),
  getLLMConfigById: (id) => ipcRenderer.invoke('llm-get-config-by-id', id),
  deleteLLMConfig: (id) => ipcRenderer.invoke('llm-delete-config', id),
  testLLMConnection: (configData) => ipcRenderer.invoke('llm-test-connection', configData),
  setDefaultLLMConfig: (id) => ipcRenderer.invoke('llm-set-default-config', id),
  getLLMFeatureConfigs: () => ipcRenderer.invoke('llm-get-feature-configs'),
  setLLMFeatureConfig: (feature, llmConfigId) =>
    ipcRenderer.invoke('llm-set-feature-config', { feature, llm_config_id: llmConfigId }),
  generateLLMSuggestions: (payload) => ipcRenderer.invoke('llm-generate-suggestions', payload),
  detectTopicShift: (payload) => ipcRenderer.invoke('llm-detect-topic-shift', payload),
  startSuggestionStream: (payload) => {
    console.log('[Preload] Sending llm-start-suggestion-stream:', payload);
    ipcRenderer.send('llm-start-suggestion-stream', payload);
    console.log('[Preload] llm-start-suggestion-stream sent successfully');
  },
  // Memory Service (结构化画像/事件)
  memoryQueryProfiles: (payload) => ipcRenderer.invoke('memory-query-profiles', payload),
  memoryQueryEvents: (payload) => ipcRenderer.invoke('memory-query-events', payload),
  onSuggestionStreamStart: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('llm-suggestion-stream-start', listener);
    return () => ipcRenderer.removeListener('llm-suggestion-stream-start', listener);
  },
  onSuggestionStreamHeader: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('llm-suggestion-stream-header', listener);
    return () => ipcRenderer.removeListener('llm-suggestion-stream-header', listener);
  },
  onSuggestionStreamChunk: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('llm-suggestion-stream-chunk', listener);
    return () => ipcRenderer.removeListener('llm-suggestion-stream-chunk', listener);
  },
  onSuggestionStreamPartial: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('llm-suggestion-stream-partial', listener);
    return () => ipcRenderer.removeListener('llm-suggestion-stream-partial', listener);
  },
  onSuggestionStreamEnd: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('llm-suggestion-stream-end', listener);
    return () => ipcRenderer.removeListener('llm-suggestion-stream-end', listener);
  },
  onSuggestionStreamError: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('llm-suggestion-stream-error', listener);
    return () => ipcRenderer.removeListener('llm-suggestion-stream-error', listener);
  },

  // 对话建议配置
  getSuggestionConfig: () => ipcRenderer.invoke('suggestion-get-config'),
  updateSuggestionConfig: (updates) => ipcRenderer.invoke('suggestion-update-config', updates),


});

// 监听主进程消息
ipcRenderer.on('window-focused', () => {
  logger.log('Window focused');
});

console.log('[Preload] Preload script loaded successfully, exposing APIs:', {
  hasStartSuggestionStream: !!window.electronAPI?.startSuggestionStream,
  hasSuggestionStreamEvents: !!window.electronAPI?.onSuggestionStreamStart
});
logger.log('Preload script loaded successfully');
