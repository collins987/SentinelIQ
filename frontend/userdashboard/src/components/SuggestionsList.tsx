import React from 'react';

interface SuggestionsListProps {
  riskScores: Array<{ id: string; score: number; type: string; suggestions: string[] }>;
}

export default function SuggestionsList({ riskScores }: SuggestionsListProps) {
  const allSuggestions = riskScores.flatMap(risk => risk.suggestions.map(s => ({ type: risk.type, suggestion: s })));
  if (allSuggestions.length === 0) return null;
  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-header-copy">
          <h2>Risk Mitigation Suggestions</h2>
          <p className="card-subtitle">Actionable steps based on your current risk profile</p>
        </div>
        <span className="card-badge">{allSuggestions.length} tips</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {allSuggestions.map((s, i) => (
          <div key={i} className="suggestion-item">
            <span className="suggestion-type">{s.type}</span>
            <span className="suggestion-text">{s.suggestion}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
