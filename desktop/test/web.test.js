import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { OperationRegistry } from '../src/server/registry.js';
import { createWebServer } from '../src/server/server.js';
import { IPCManager } from '../src/core/modules/ipc-handlers.js';
import DatabaseManager from '../src/db/database.js';

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}

test('web operations preserve conversations, suggestions, review and persistence without audio', async context => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'livegalgame-web-test-'));
  const registry = new OperationRegistry();
  const services = new IPCManager();
  const databasePath = path.join(directory, 'test.db');
  let appServer;
  let mockServer;
  context.after(async () => {
    if (appServer) await close(appServer);
    if (mockServer) await close(mockServer);
    if (services.db?.db.open) services.db.close();
    if (!directory.startsWith(path.join(os.tmpdir(), 'livegalgame-web-test-'))) throw new Error('Unexpected temporary path');
    await fs.rm(directory, { recursive: true, force: true });
  });
  services.registerHandlers(registry, { dbPath: databasePath });
  await fs.writeFile(path.join(directory, 'index.html'), '<html>test app</html>');
  ({ server: appServer } = createWebServer({ registry, publicDirectory: directory }));
  const baseUrl = await listen(appServer);
  const request = async (operation, argumentsList = [], headers = {}) => fetch(`${baseUrl}/api/rpc/${operation}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(argumentsList)
  });
  const rpc = async (operation, ...argumentsList) => {
    const response = await request(operation, argumentsList);
    assert.equal(response.status, 200, operation);
    const packets = (await response.text()).trim().split('\n').map(line => JSON.parse(line));
    const failure = packets.find(packet => packet.type === 'error');
    assert.equal(failure, undefined, failure?.error);
    return { result: packets.find(packet => packet.type === 'result')?.data, packets };
  };

  await context.test('assets, health, origin, path and operation boundaries', async () => {
    assert.equal((await fetch(baseUrl)).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/health`)).status, 200);
    assert.equal((await request('asr-start')).status, 404);
    assert.equal((await request('db-get-statistics', [], { Origin: 'http://untrusted.invalid' })).status, 403);
    assert.equal((await request('db-get-statistics', [], { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await request('db-update-conversation', ['x', { 'title = NULL; DROP TABLE messages;--': 'bad' }])).status, 400);
    assert.equal((await request('llm-save-config', [{ base_url: 'file:///etc/passwd' }])).status, 400);
    assert.equal((await request('db-get-statistics', ['x'.repeat(1024 * 1024)])).status, 413);
    const traversal = await fetch(`${baseUrl}/%2e%2e%2fpackage.json`);
    assert.equal(traversal.status, 403);
    assert.deepEqual(services.db.db.prepare("SELECT name FROM sqlite_master WHERE name IN ('audio_sources','speech_recognition_records','asr_configs')").all(), []);
  });

  const character = (await rpc('db-create-character', { name: '网页测试角色' })).result;
  const conversation = (await rpc('db-create-conversation', { character_id: character.id, title: '网页测试会话' })).result;
  await context.test('role, message, settings and history contracts', async () => {
    assert.ok(character.id);
    await rpc('db-create-message', { conversation_id: conversation.id, sender: 'character', content: '周末有什么安排？' });
    const messages = (await rpc('db-get-messages-by-conversation', conversation.id)).result;
    assert.equal(messages[0].content, '周末有什么安排？');
    await rpc('db-update-message', messages[0].id, { content: '周末一起散步吗？' });
    assert.equal((await rpc('db-get-messages-by-conversation', conversation.id)).result[0].content, '周末一起散步吗？');
    await rpc('db-update-conversation', conversation.id, { title: '已更新' });
    assert.equal((await rpc('db-get-conversation-by-id', conversation.id)).result.title, '已更新');
    assert.ok((await rpc('db-get-statistics')).result.messageCount > 0);
    assert.ok((await rpc('db-get-character-details', character.id)).result);
    await rpc('suggestion-update-config', { suggestion_count: 2, enable_passive_suggestion: 0 });
    assert.equal((await rpc('suggestion-get-config')).result.suggestion_count, 2);
  });

  await context.test('stream failure without LLM configuration is observable', async () => {
    const { packets } = await rpc('llm-start-suggestion-stream', { streamId: 'missing-config', conversationId: conversation.id, characterId: character.id });
    assert.ok(packets.some(packet => packet.channel === 'llm-suggestion-stream-error' && packet.data.streamId === 'missing-config'));
  });

  mockServer = http.createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body);
    if (!payload.stream) {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }));
      return;
    }
    const isReview = payload.messages.some(message => message.content.includes('review_summary'));
    const content = isReview
      ? 'review_summary[1]{total_affinity_change,title,conversation_summary,self_evaluation,chat_overview,expression_score,expression_desc,topic_score,topic_desc,tags,attitude_analysis}:\n2,网页复盘,讨论散步,表达清晰,友好,80,自然,80,合适,日常,积极\n'
      : 'suggestions[2]{suggestion,affinity_delta,tags}:\n可以一起去公园散步,2,轻松\n先询问对方方便的时间,1,体贴\n';
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    for (const part of [content.slice(0, 45), content.slice(45)]) {
      response.write(`data: ${JSON.stringify({ choices: [{ delta: { content: part }, finish_reason: null }] })}\n\n`);
    }
    response.end('data: [DONE]\n\n');
  });
  const mockUrl = await listen(mockServer);
  await rpc('llm-save-config', { name: 'isolated-test', api_key: 'invalid-test-placeholder', base_url: `${mockUrl}/v1`, model_name: 'test-model', is_default: true });
  await context.test('real LLM adapter streams suggestions and saves adoption', async () => {
    const connection = (await rpc('llm-test-connection', { api_key: 'invalid-test-placeholder', base_url: `${mockUrl}/v1`, model_name: 'test-model' })).result;
    assert.equal(connection.success, true);
    const { packets } = await rpc('llm-start-suggestion-stream', { streamId: 'test-stream', conversationId: conversation.id, characterId: character.id, trigger: 'manual', reason: 'manual', optionCount: 2 });
    const chunks = packets.filter(packet => packet.channel === 'llm-suggestion-stream-chunk');
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].data.streamId, 'test-stream');
    assert.match(chunks[0].data.suggestion.content, /公园/);
    const identifier = chunks[0].data.suggestion.id;
    assert.equal((await rpc('db-select-action-suggestion', { suggestionId: identifier, selected: true })).result, true);
  });
  await context.test('review runs without speech tables and emits progress', async () => {
    const { result, packets } = await rpc('review:generate', { conversationId: conversation.id, force: true, requestId: 'test-review' });
    assert.equal(result.success, true, result.error);
    assert.equal(result.data.summary.title, '网页复盘');
    assert.ok(packets.some(packet => packet.channel === 'review:progress' && packet.data.stage === 'done'));
    assert.equal((await rpc('review:get', conversation.id)).result.success, true);
  });
  await context.test('data survives reopening and deletion cascades', async () => {
    services.db.close();
    const reopened = new DatabaseManager({ dbPath: databasePath });
    try {
      // Review intentionally updates the conversation title to the generated summary title.
      assert.equal(reopened.getConversationById(conversation.id).title, '网页复盘');
      assert.equal(reopened.getMessagesByConversation(conversation.id).length, 1);
      assert.ok(reopened.getConversationReview(conversation.id));
      assert.equal(reopened.deleteCharacter(character.id), true);
      assert.equal(reopened.getConversationById(conversation.id), undefined);
    } finally { reopened.close(); }
  });
});
