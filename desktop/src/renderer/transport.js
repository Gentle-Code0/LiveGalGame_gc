const listeners = new Map();
const requests = new Set();

export function subscribe(channel, callback, once = false) {
  if (!listeners.has(channel)) listeners.set(channel, new Map());
  listeners.get(channel).set(callback, once);
  return () => unsubscribe(channel, callback);
}

export function unsubscribe(channel, callback) {
  listeners.get(channel)?.delete(callback);
}

function emit(channel, data) {
  for (const [callback, once] of [...(listeners.get(channel) || [])]) {
    if (once) unsubscribe(channel, callback);
    callback(data);
  }
}

/** Decode NDJSON incrementally so suggestion cards and review progress remain live. */
async function invoke(channel, ...argumentsList) {
  const controller = new AbortController();
  requests.add(controller);
  const deadline = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(`/api/rpc/${encodeURIComponent(channel)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(argumentsList), signal: controller.signal
    });
    if (!response.ok) throw new Error(`服务请求失败（${response.status}）`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    let result;
    let completed = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        let newlineIndex;
        while ((newlineIndex = pending.indexOf('\n')) !== -1) {
          const line = pending.slice(0, newlineIndex);
          pending = pending.slice(newlineIndex + 1);
          if (!line) continue;
          const packet = JSON.parse(line);
          if (packet.type === 'event') emit(packet.channel, packet.data);
          if (packet.type === 'error') throw new Error(packet.error);
          if (packet.type === 'result') { completed = true; result = packet.data; }
        }
        if (done) break;
      }
      if (!completed) throw new Error('服务连接中断，请重试');
      return result;
    } finally { reader.releaseLock(); }
  } finally {
    clearTimeout(deadline);
    requests.delete(controller);
  }
}

export const transport = {
  invoke,
  on: subscribe,
  removeListener: unsubscribe,
  send(channel, payload) {
    if (channel === 'suggestion-config-updated') { emit(channel, payload); return; }
    if (channel !== 'llm-start-suggestion-stream') throw new Error('Unsupported operation');
    return invoke(channel, payload).catch(error => emit('llm-suggestion-stream-error', { streamId: payload?.streamId, error: error.message }));
  }
};

window.addEventListener('pagehide', () => {
  for (const request of requests) request.abort();
});
