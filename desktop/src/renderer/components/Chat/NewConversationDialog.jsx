import { useEffect, useState } from 'react';

/** Preserve the old session selector's create operation after removing its HUD host. */
export default function NewConversationDialog({ onCreated, onClose }) {
  const [characters, setCharacters] = useState([]);
  const [characterId, setCharacterId] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    window.electronAPI.getAllCharacters().then(result => {
      if (!active) return;
      setCharacters(result);
      setCharacterId(result[0]?.id || '');
    }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, []);
  const create = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const conversation = await window.electronAPI.dbCreateConversation({ character_id: characterId, title: title.trim() || '新对话' });
      if (!conversation?.id) throw new Error('创建对话失败');
      await onCreated(conversation);
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
    <form onSubmit={create} role="dialog" aria-modal="true" aria-label="新建对话" className="bg-white dark:bg-surface-dark rounded-2xl p-6 w-full max-w-md space-y-4">
      <h2 className="text-xl font-bold">新建对话</h2>
      <label htmlFor="new-conversation-character" className="block">对话对象</label>
        <select id="new-conversation-character" required value={characterId} onChange={event => setCharacterId(event.target.value)} className="block w-full border rounded-lg p-2 mt-2">
          {characters.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}
        </select>
      {!characters.length && <p>请先在“攻略对象”中创建角色。</p>}
      <label htmlFor="new-conversation-title" className="block">对话名称</label>
      <input id="new-conversation-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={200} className="block w-full border rounded-lg p-2 mt-2" placeholder="新对话" />
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" disabled={saving} onClick={onClose}>取消</button>
        <button disabled={saving || !characterId} className="bg-primary text-white rounded-lg px-4 py-2">{saving ? '创建中…' : '创建'}</button>
      </div>
    </form>
  </div>;
}
