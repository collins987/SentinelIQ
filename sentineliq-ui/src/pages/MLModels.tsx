// ============================================================================
// ML Models Page - Model Status, Anomaly Detection & Risk Prediction
// ============================================================================

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

interface MLModel {
  id: string;
  name: string;
  type: 'anomaly_detection' | 'risk_prediction' | 'classification';
  status: 'active' | 'training' | 'inactive';
  version: string;
  accuracy: number;
  last_trained: string;
  predictions_today: number;
}

interface AnomalyPoint {
  x: number;
  y: number;
  z: number;
  is_anomaly: boolean;
  user_id: string;
}

const mockModels: MLModel[] = [
  {
    id: 'model-1',
    name: 'Isolation Forest',
    type: 'anomaly_detection',
    status: 'active',
    version: 'v2.3.1',
    accuracy: 0.94,
    last_trained: '2024-01-14T18:30:00Z',
    predictions_today: 12458,
  },
  {
    id: 'model-2',
    name: 'Risk Score Predictor',
    type: 'risk_prediction',
    status: 'active',
    version: 'v1.8.0',
    accuracy: 0.91,
    last_trained: '2024-01-13T22:15:00Z',
    predictions_today: 8924,
  },
  {
    id: 'model-3',
    name: 'Transaction Classifier',
    type: 'classification',
    status: 'training',
    version: 'v3.0.0-beta',
    accuracy: 0.88,
    last_trained: '2024-01-12T14:00:00Z',
    predictions_today: 0,
  },
  {
    id: 'model-4',
    name: 'Behavior Analyzer',
    type: 'anomaly_detection',
    status: 'active',
    version: 'v1.2.4',
    accuracy: 0.89,
    last_trained: '2024-01-14T08:45:00Z',
    predictions_today: 6542,
  },
];

const modelPerformance = [
  { date: 'Jan 8', isolation_forest: 0.92, risk_predictor: 0.89, behavior: 0.87 },
  { date: 'Jan 9', isolation_forest: 0.93, risk_predictor: 0.90, behavior: 0.88 },
  { date: 'Jan 10', isolation_forest: 0.93, risk_predictor: 0.90, behavior: 0.88 },
  { date: 'Jan 11', isolation_forest: 0.94, risk_predictor: 0.91, behavior: 0.89 },
  { date: 'Jan 12', isolation_forest: 0.94, risk_predictor: 0.91, behavior: 0.89 },
  { date: 'Jan 13', isolation_forest: 0.94, risk_predictor: 0.91, behavior: 0.89 },
  { date: 'Jan 14', isolation_forest: 0.94, risk_predictor: 0.91, behavior: 0.89 },
];

// Generate scatter data for anomaly visualization
const generateAnomalyData = (): AnomalyPoint[] => {
  const data: AnomalyPoint[] = [];
  for (let i = 0; i < 100; i++) {
    const isAnomaly = Math.random() > 0.9;
    data.push({
      x: isAnomaly ? Math.random() * 40 + 60 : Math.random() * 50 + 10,
      y: isAnomaly ? Math.random() * 40 + 60 : Math.random() * 50 + 10,
      z: isAnomaly ? 200 : 100,
      is_anomaly: isAnomaly,
      user_id: `user-${i + 1}`,
    });
  }
  return data;
};

const anomalyData = generateAnomalyData();
const normalData = anomalyData.filter((d) => !d.is_anomaly);
const anomalyPoints = anomalyData.filter((d) => d.is_anomaly);

export default function MLModelsPage() {
  const [selectedModel, setSelectedModel] = useState<MLModel | null>(null);
  const [userIdInput, setUserIdInput] = useState('');
  const [predictionResult, setPredictionResult] = useState<{
    risk_score: number;
    is_anomaly: boolean;
    confidence: number;
    factors: string[];
  } | null>(null);

  const handlePredict = () => {
    // Mock prediction
    setPredictionResult({
      risk_score: Math.floor(Math.random() * 100),
      is_anomaly: Math.random() > 0.7,
      confidence: 0.85 + Math.random() * 0.15,
      factors: ['High transaction velocity', 'New device detected', 'Unusual login time'],
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-900/30';
      case 'training': return 'text-yellow-400 bg-yellow-900/30';
      case 'inactive': return 'text-gray-400 bg-gray-900/30';
      default: return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'anomaly_detection': return '🔍';
      case 'risk_prediction': return '📊';
      case 'classification': return '🏷️';
      default: return '🤖';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1>ML Models</h1>
          <p>Machine learning models for fraud detection and risk prediction</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary">Retrain All</button>
          <button className="btn-primary">Deploy New Model</button>
        </div>
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {mockModels.map((model) => (
          <div
            key={model.id}
            onClick={() => setSelectedModel(model)}
            className={`glass-card p-5 cursor-pointer transition-all hover:scale-[1.02] ${
              selectedModel?.id === model.id ? 'ring-2 ring-indigo-500' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{getTypeIcon(model.type)}</span>
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(model.status)}`}>
                {model.status === 'training' ? '⏳ Training' : model.status}
              </span>
            </div>
            <h3 className="text-white font-semibold mb-1">{model.name}</h3>
            <p className="text-xs text-gray-400 mb-3">{model.version}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Accuracy</p>
                <p className="text-lg font-bold text-white">{(model.accuracy * 100).toFixed(0)}%</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Today</p>
                <p className="text-lg font-bold text-indigo-400">{model.predictions_today.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Model Performance Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Model Performance Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={modelPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis domain={[0.8, 1]} stroke="#9ca3af" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
            />
            <Line type="monotone" dataKey="isolation_forest" name="Isolation Forest" stroke="#6366f1" strokeWidth={2} />
            <Line type="monotone" dataKey="risk_predictor" name="Risk Predictor" stroke="#8b5cf6" strokeWidth={2} />
            <Line type="monotone" dataKey="behavior" name="Behavior Analyzer" stroke="#14b8a6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Anomaly Detection Visualization */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Anomaly Detection Scatter</h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" dataKey="x" name="Feature 1" stroke="#9ca3af" domain={[0, 100]} />
              <YAxis type="number" dataKey="y" name="Feature 2" stroke="#9ca3af" domain={[0, 100]} />
              <ZAxis type="number" dataKey="z" range={[50, 200]} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Scatter name="Normal" data={normalData} fill="#6366f1" />
              <Scatter name="Anomaly" data={anomalyPoints} fill="#ef4444" />
            </ScatterChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-sm text-gray-400">Normal ({normalData.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-400">Anomaly ({anomalyPoints.length})</span>
            </div>
          </div>
        </div>

        {/* Risk Prediction Interface */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Risk Prediction</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">User ID or Email</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Enter user ID or email..."
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                />
                <button onClick={handlePredict} className="btn-primary">Predict</button>
              </div>
            </div>

            {predictionResult && (
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-4 animate-fade-in">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Risk Score</p>
                    <p className={`text-3xl font-bold ${
                      predictionResult.risk_score >= 80 ? 'text-red-400' :
                      predictionResult.risk_score >= 60 ? 'text-orange-400' :
                      predictionResult.risk_score >= 40 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {predictionResult.risk_score}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Anomaly</p>
                    <p className={`text-lg font-bold ${predictionResult.is_anomaly ? 'text-red-400' : 'text-green-400'}`}>
                      {predictionResult.is_anomaly ? '⚠️ Yes' : '✅ No'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Confidence</p>
                    <p className="text-lg font-bold text-indigo-400">
                      {(predictionResult.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Risk Factors</p>
                  <div className="space-y-2">
                    {predictionResult.factors.map((factor, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-orange-400">•</span>
                        <span className="text-gray-300">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Model Details Drawer */}
      {selectedModel && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Model Details: {selectedModel.name}</h3>
            <button onClick={() => setSelectedModel(null)} className="text-gray-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Type</p>
              <p className="text-white capitalize">{selectedModel.type.replace('_', ' ')}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Version</p>
              <p className="text-white font-mono">{selectedModel.version}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Last Trained</p>
              <p className="text-white">{new Date(selectedModel.last_trained).toLocaleDateString()}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Predictions Today</p>
              <p className="text-white">{selectedModel.predictions_today.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button className="btn-secondary">View Training History</button>
            <button className="btn-secondary">Download Model</button>
            <button className="btn-primary">Retrain Model</button>
          </div>
        </div>
      )}
    </div>
  );
}
