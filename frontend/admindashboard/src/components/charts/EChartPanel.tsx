import React from 'react';
import ReactECharts from 'echarts-for-react';

interface EChartPanelProps {
  title: string;
  subtitle?: string;
  option: Record<string, unknown>;
  height?: number;
}

export default function EChartPanel({ title, subtitle, option, height = 260 }: EChartPanelProps) {
  return (
    <div className="card h-full">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <ReactECharts option={option} style={{ height }} notMerge={true} lazyUpdate={true} />
    </div>
  );
}
