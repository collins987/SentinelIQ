/**
 * User Risk Card Component
 * Displays risk scores and security suggestions
 */

import { ShieldExclamationIcon, ExclamationTriangleIcon, CheckCircleIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import type { RiskScore } from '../../types/user';

interface UserRiskCardProps {
  riskScores: RiskScore[] | undefined;
  isLoading?: boolean;
}

export default function UserRiskCard({ riskScores, isLoading }: UserRiskCardProps) {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-24 bg-gray-700 rounded"></div>
      </div>
    );
  }

  // Calculate overall risk score
  const overallScore = riskScores && riskScores.length > 0
    ? riskScores[0].score
    : 0;

  const getRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'high', color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/30' };
    if (score >= 40) return { level: 'medium', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/30' };
    return { level: 'low', color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/30' };
  };

  const riskInfo = getRiskLevel(overallScore);

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />;
      case 'medium':
        return <ShieldExclamationIcon className="w-8 h-8 text-yellow-400" />;
      default:
        return <CheckCircleIcon className="w-8 h-8 text-green-400" />;
    }
  };

  // Get all suggestions from all risk scores
  const allSuggestions = riskScores?.flatMap(rs => rs.suggestions) || [];

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShieldExclamationIcon className="w-5 h-5 text-sentinel-400" />
          Security Status
        </h3>
      </div>

      {/* Risk Score Display */}
      <div className={`rounded-lg p-4 ${riskInfo.bgColor} border ${riskInfo.borderColor} mb-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getRiskIcon(riskInfo.level)}
            <div>
              <p className={`text-2xl font-bold ${riskInfo.color}`}>
                {overallScore}
              </p>
              <p className="text-sm text-gray-400">Risk Score</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${riskInfo.bgColor} ${riskInfo.color} border ${riskInfo.borderColor}`}>
              {riskInfo.level.charAt(0).toUpperCase() + riskInfo.level.slice(1)} Risk
            </span>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {allSuggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-1">
            <LightBulbIcon className="w-4 h-4 text-yellow-400" />
            Security Recommendations
          </h4>
          <ul className="space-y-2">
            {allSuggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
                <span className="text-sentinel-400 mt-0.5">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No Risk Scores */}
      {(!riskScores || riskScores.length === 0) && (
        <div className="text-center py-4">
          <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-2" />
          <p className="text-gray-400">No risk factors detected</p>
        </div>
      )}
    </div>
  );
}
