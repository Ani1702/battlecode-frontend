"use client";
import { useEffect, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ScriptableContext, ChartTypeRegistry, ChartOptions } from 'chart.js';

declare module 'chart.js' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface PluginOptionsByType<TType extends keyof ChartTypeRegistry> {
    customColors?: string[];
    centerText?: {
      top?: string;
      bottom?: string;
    };
  }
}

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



const outerGlowPlugin = {
  id: 'outerGlow',
  beforeDatasetsDraw: (chart: ChartJS) => {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const colors = (chart.config.options?.plugins as any)?.customColors;
    if (!colors) return;

    ctx.save();
    meta.data.forEach((arc, index) => {
      const { x, y, startAngle, endAngle, outerRadius } = arc.getProps([
        'x', 'y', 'startAngle', 'endAngle', 'outerRadius'
      ]);
      const color = colors[index];

      if (typeof color === 'string') {
        ctx.shadowColor = color;
        ctx.shadowBlur = 15; // Final subtle glow
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw a transparent line whose shadow creates the glow
        ctx.beginPath();
        ctx.arc(x, y, outerRadius, startAngle, endAngle);
        ctx.lineWidth = 4; // Final subtle glow source
        ctx.strokeStyle = 'transparent';
        ctx.stroke();
      }
    });
    ctx.restore();
  },
};

// Plugin to create a 3D bevel effect with a light source from the top
const threeDBevelPlugin = {
  id: 'threeDBevel',
  beforeDatasetsDraw: (chart: ChartJS) => {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const colors = (chart.config.options?.plugins as any)?.customColors;
    if (!colors) return;

    const borderWidth = chart.data.datasets[0].borderWidth as number;

    meta.data.forEach((arc, index) => {
      const { x, y, innerRadius, outerRadius, startAngle, endAngle } = arc.getProps([
        'x', 'y', 'innerRadius', 'outerRadius', 'startAngle', 'endAngle'
      ]);
      const color = colors[index];
      const bevelWidth = 2;

      // Define the drawing area, inset by the full border width
      const fillOuterRadius = outerRadius - borderWidth;
      const fillInnerRadius = innerRadius + borderWidth;

      // 1. Draw the dark fill
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, fillOuterRadius, startAngle, endAngle);
      ctx.arc(x, y, fillInnerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();
      ctx.restore();

      // 2. Draw the bevels
      ctx.lineWidth = bevelWidth;

      // --- Draw the full shadow lines first ---
      ctx.strokeStyle = '#000';
      // Outer shadow
      ctx.beginPath();
      ctx.arc(x, y, fillOuterRadius - bevelWidth / 2, startAngle, endAngle);
      ctx.stroke();
      // Inner shadow
      ctx.beginPath();
      ctx.arc(x, y, fillInnerRadius + bevelWidth / 2, startAngle, endAngle);
      ctx.stroke();

      // --- Draw the highlights on top, clipped to the top half ---
      ctx.save(); // Save context before clipping

      // Create clipping region (top half of the chart)
      ctx.beginPath();
      ctx.rect(x - outerRadius, y - outerRadius, outerRadius * 2, outerRadius);
      ctx.clip();

      // Draw full highlight arcs; they will only be visible in the top half
      ctx.strokeStyle = color;
      // Outer highlight
      ctx.beginPath();
      ctx.arc(x, y, fillOuterRadius - bevelWidth / 2, startAngle, endAngle);
      ctx.stroke();
      // Inner highlight
      ctx.beginPath();
      ctx.arc(x, y, fillInnerRadius + bevelWidth / 2, startAngle, endAngle);
      ctx.stroke();

      ctx.restore(); // Removes clip
    });
  }
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

        // Set canvas dimensions explicitly
        chartRef.current.width = 192; // 48 * 4 (for high DPI)
        chartRef.current.height = 192;
        chartRef.current.style.width = '192px';
        chartRef.current.style.height = '192px';

        const chartOptions: ChartOptions<'doughnut'> = {
          responsive: false,
          maintainAspectRatio: false,
          cutout: '80%',
          plugins: {
            customColors: data.colors,
            legend: {
              display: false,
            },
            tooltip: {
              enabled: false,
            },
            centerText: {
              top: centerTextTop,
              bottom: centerTextBottom,
            },
          },
          animation: {
            animateRotate: true,
            animateScale: false,
            duration: 1200,
          },
          elements: {
            arc: {
              borderWidth: 0,
            },
          },
        };

        chartInstance.current = new ChartJS(ctx, {
          type: 'doughnut',
          data: {
            labels: data.labels,
            datasets: [
              {
                data: data.values,
                backgroundColor: 'transparent',
                borderColor: '#000',
                borderWidth: 4,
                spacing: 5,
              },
            ],
          },
          options: chartOptions,
          plugins: [outerGlowPlugin, centerTextPlugin, threeDBevelPlugin],
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
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 12px ${color}`,
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
