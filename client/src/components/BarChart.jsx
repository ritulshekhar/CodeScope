import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: '#181c28',
            borderColor: '#252a3a',
            borderWidth: 1,
            titleColor: '#e6eaf4',
            bodyColor: '#8892a4',
        }
    },
    scales: {
        x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#8892a4', font: { size: 11 } },
            border: { display: false }
        },
        y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#8892a4', font: { size: 11 } },
            border: { display: false }
        }
    }
};

export default function BarChart({ labels, data, label = '' }) {
    const chartData = {
        labels,
        datasets: [{
            label,
            data,
            backgroundColor: '#b5f23d',
            borderRadius: 4,
            borderSkipped: false,
            hoverBackgroundColor: '#c8ff47',
        }]
    };

    return <Bar data={chartData} options={baseOptions} />;
}
