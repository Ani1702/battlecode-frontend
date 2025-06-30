"use client";
import { useEffect, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

// Custom plugin for drawing text in the center of the doughnut chart
const centerTextPlugin = {
  id: 'centerText',
  afterDraw: (chart: ChartJS) => {
    const { ctx } = chart;
    const centerTextTop = (chart.config.options as any)?.plugins?.centerText?.top || '';
    const centerTextBottom = (chart.config.options as any)?.plugins?.centerText?.bottom || '';
    if (!centerTextTop && !centerTextBottom) return;

    const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
    const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px Oxanium, sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText(centerTextTop, centerX, centerY - 10);

    ctx.font = '14px Oxanium, sans-serif';
    ctx.fillStyle = '#9ca3af'; // a light gray
    ctx.fillText(centerTextBottom, centerX, centerY + 10);
    ctx.restore();
  },
};

// Custom plugin for applying a glow to each segment
const segmentGlowPlugin = {
  id: 'segmentGlow',
  beforeDatasetsDraw: (chart: ChartJS) => {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const dataset = chart.data.datasets[0];

    ctx.save();
    meta.data.forEach((arc, index) => {
      const { x, y, startAngle, endAngle, outerRadius } = arc.getProps([
        'x',
        'y',
        'startAngle',
        'endAngle',
        'outerRadius',
      ]);
      const color = Array.isArray(dataset.borderColor) ? dataset.borderColor[index] : dataset.borderColor;

      if (typeof color === 'string') {
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw the arc path to apply the shadow to
        ctx.beginPath();
        ctx.arc(x, y, outerRadius + 2, startAngle, endAngle);
        ctx.strokeStyle = 'transparent'; // We only want the shadow, not a visible line
        ctx.lineWidth = 5;
        ctx.stroke();
      }
    });
    ctx.restore();
  },
};

interface PieChartProps {
  data: {
    labels: string[];
    values: number[];
    colors: string[];
  };
  centerTextTop?: string;
  centerTextBottom?: string;
  className?: string;
  ownedCount?: number; // Number of owned badges/segments to show in legend
}

const defaultChartData = {
  labels: ['Coding', 'Analysing', 'Label 3', 'Label 4'],
  values: [45, 25, 15, 15],
  colors: ['#ff6b00', '#dc2626', '#f59e0b', '#9ca3af'],
};

export default function PieChart({
  data = defaultChartData,
  centerTextTop = 'TIME SPENT',
  centerTextBottom = '8 Hours',
  className = '',
  ownedCount = 4,
}: PieChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        chartInstance.current = new ChartJS(ctx, {
          type: 'doughnut',
          data: {
            labels: data.labels,
            datasets: [
              {
                data: data.values,
                backgroundColor: data.colors.map(color => `${color}33`), // Semi-transparent version of border color
                borderColor: data.colors,
                borderWidth: 2,
                spacing: 10,
                borderRadius: 8,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            plugins: {
              legend: {
                display: false, // Disable default legend
              },
              tooltip: {
                enabled: false, // Disable tooltips as per design
              },
              centerText: {
                top: centerTextTop,
                bottom: centerTextBottom,
              } as any,
            },
            animation: {
              animateRotate: true,
              animateScale: true,
              duration: 1200,
            } as any,
          } as any,
          plugins: [segmentGlowPlugin, centerTextPlugin],
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, centerTextTop, centerTextBottom]);

  return (
    <div className={`w-full h-full flex items-center justify-center gap-8 ${className}`}>
      <div className="relative w-48 h-48 flex-shrink-0">
        <canvas ref={chartRef} />
      </div>
      <div className="relative  flex flex-col gap-4 text-sm text-gray-300 font-sans">
        {data.labels.slice(0, ownedCount).map((label, index) => {
          const color = data.colors[index];
          const value = data.values[index];
          return (
            <div key={label} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full border-2"
                style={{
                  borderColor: color,
                  boxShadow: `0 0 8px ${color}`,
                }}
              />
              <span className="text-base">{`${label} (${value})`}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
