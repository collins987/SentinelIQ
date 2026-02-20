import React from 'react';

interface SuggestionsListProps {
  riskScores: Array<{ id: string; score: number; type: string; suggestions: string[] }>;
}

export default function SuggestionsList({ riskScores }: SuggestionsListProps) {
  const allSuggestions = riskScores.flatMap(risk => risk.suggestions.map(s => ({ type: risk.type, suggestion: s })));
  if (allSuggestions.length === 0) return null;
  return (
    <div className="card" style={{ minHeight: 100 }}>
      <h2 style={{ marginBottom: 14 }}>Risk Mitigation Suggestions</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 8,
      }}>
        {allSuggestions.map((s, i) => (
          <div key={i} style={{ background: '#f7f8fa', borderRadius: 6, padding: '8px 12px', fontSize: 15 }}>
            <b style={{ color: '#2563eb' }}>{s.type}:</b> {s.suggestion}
          </div>
        ))}
      </div>
    </div>
  );
}
