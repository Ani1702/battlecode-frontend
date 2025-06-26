import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function BarChart() {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (chartRef.current) {
            
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }

            const ctx = chartRef.current.getContext('2d');
            
            if (ctx) {
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, 'rgba(255, 255, 153, 0.2)');    // Light yellow at top
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');        // Black at bottom
                chartInstance.current = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['easy', 'medium', 'hard'],
                        datasets: [{
                            label: '# of Votes',
                            data: [12, 19, 3],
                            backgroundColor: gradient,
                            borderColor: 'rgba(255, 255, 152, 0.7)', // Darker yellow for border
                            borderWidth: {
                                top: 3,    // Only top border
                                right: 0,  // No right border
                                bottom: 0, // No bottom border
                                left: 0    // No left border
                            }
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: {
                                    display: false
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                }
                            }
                        },                        plugins: {
                            title: {
                                display: false,
                                text: 'Sample Bar Chart',
                                font: {
                                    size: 24
                                }
                            },
                            legend: {
                                display: false,
                                position: 'top'
                            }
                        }
                    }
                });
            }
        }

        // Cleanup function
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, []); // Empty dependency array means this runs once after mount

    return (
        <div className="w-full h-full flex items-center justify-center">
            <canvas ref={chartRef} className="w-full h-full"></canvas>
        </div>
    );
}