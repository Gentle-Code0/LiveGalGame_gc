import { transport as ipcRenderer, subscribe, unsubscribe } from './transport.js';

// Compatibility name for the existing UI; no Electron runtime is used.
window.electronAPI = {
  // 平台信息
  platform: 'web',

  // IPC通信
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => subscribe(channel, callback),
  once: (channel, callback) => subscribe(channel, callback, true),
  removeListener: (channel, callback) => unsubscribe(channel, callback),

  // 日志

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
    const listener = (data) => callback(data);
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
    const listener = (data) => callback(data);
    ipcRenderer.on('llm-suggestion-stream-start', listener);
    return () => ipcRenderer.removeListener('llm-suggestion-stream-start', listener);
  },
  onSuggestionStreamHeader: (callback) => {
    const listener = (data) => callback(data);
    ipcRenderer.on('llm-suggestion-stream-header', listener);
    return () => ipcRenderer.removeListener('llm-suggestion-stream-header', listener);
  },
  onSuggestionStreamChunk: (callback) => {
    const listener = (data) => callback(data);
    ipcRenderer.on('llm-suggestion-stream-chunk', listener);
    return () => ipcRenderer.removeListener('llm-suggestion-stream-chunk', listener);
  },
  onSuggestionStreamPartial: (callback) => {
    const listener = (data) => callback(data);
    ipcRenderer.on('llm-suggestion-stream-partial', listener);
    return () => ipcRenderer.removeListener('llm-suggestion-stream-partial', listener);
  },
  onSuggestionStreamEnd: (callback) => {
    const listener = (data) => callback(data);
    ipcRenderer.on('llm-suggestion-stream-end', listener);
    return () => ipcRenderer.removeListener('llm-suggestion-stream-end', listener);
  },
  onSuggestionStreamError: (callback) => {
    const listener = (data) => callback(data);
    ipcRenderer.on('llm-suggestion-stream-error', listener);
    return () => ipcRenderer.removeListener('llm-suggestion-stream-error', listener);
  },

  // 对话建议配置
  getSuggestionConfig: () => ipcRenderer.invoke('suggestion-get-config'),
  updateSuggestionConfig: (updates) => ipcRenderer.invoke('suggestion-update-config', updates),


};
