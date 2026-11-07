import { useMemo } from 'react';
import { useSuggestions } from '../../hooks/useSuggestions.js';
import { SuggestionsPanel } from './SuggestionsPanel.jsx';
import './suggestions.css';

/** Keep the existing suggestion cards on the conversation page without a HUD window. */
export default function ConversationSuggestions({ conversation }) {
  const sessionInfo = useMemo(() => ({
    conversationId: conversation.id,
    characterId: conversation.character_id
  }), [conversation.id, conversation.character_id]);
  const suggestions = useSuggestions(sessionInfo);
  return <div className="conversation-suggestions max-w-5xl mx-auto">
    <SuggestionsPanel
      {...suggestions}
      onGenerate={suggestions.handleGenerateSuggestions}
      onCopy={suggestions.handleCopySuggestion}
      onSelectSuggestion={suggestions.handleSelectSuggestion}
      onTogglePassive={enabled => suggestions.updateSuggestionConfig({ enable_passive_suggestion: enabled ? 1 : 0 })}
      sessionInfo={sessionInfo}
    />
  </div>;
}
