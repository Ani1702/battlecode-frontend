"use client";
import { useEffect, useRef } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, ChartOptions } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

// Simple center text plugin
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
    
    // Top text
    if (centerTextTop) {
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillStyle = '#ff6b00';
      ctx.fillText(centerTextTop, centerX, centerY - 10);
    }

    // Bottom text
    if (centerTextBottom) {
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(centerTextBottom, centerX, centerY + 10);
    }
    
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
  labels: ['Coding', 'Analysing', 'Problem Solving', 'Testing'],
  values: [45, 25, 20, 10],
  colors: ['#ff6b00', '#dc2626', '#f59e0b', '#06b6d4'],
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

        const chartOptions: ChartOptions<'doughnut'> = {
          responsive: true,
          maintainAspectRatio: true,
          cutout: '70%',
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              enabled: true,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: '#ff6b00',
              borderWidth: 1,
            },
          },
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1000,
            easing: 'easeOutCubic',
          },
          elements: {
            arc: {
              borderWidth: 2,
              borderColor: '#1a1a1a',
              hoverBorderWidth: 3,
              hoverBorderColor: '#fff',
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
                backgroundColor: data.colors,
                borderColor: '#1a1a1a',
                borderWidth: 2,
                spacing: 2,
                hoverBackgroundColor: data.colors.map(color => `${color}CC`),
                hoverBorderWidth: 3,
                hoverBorderColor: '#ffffff',
              },
            ],
          },
          options: {
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              centerText: {
                top: centerTextTop,
                bottom: centerTextBottom,
              },
            } as any,
          },
          plugins: [centerTextPlugin],
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
        <canvas 
          ref={chartRef} 
          className="w-full h-full" 
          width={192} 
          height={192}
          style={{ maxWidth: '192px', maxHeight: '192px' }}
        />
      </div>
      <div className="flex flex-col gap-3 text-sm text-gray-300 font-medium">
        {data.labels.slice(0, ownedCount).map((label, index) => {
          const color = data.colors[index];
          const value = data.values[index];
          return (
            <div key={label} className="flex items-center gap-4 hover:scale-105 transition-transform duration-200">
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 8px ${color}60`,
                }}
              ></div>
              <span className="text-base font-medium hover:text-white transition-colors duration-200">
                {label}
              </span>
              <span className="text-sm text-gray-400 ml-auto font-bold">
                {value}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
