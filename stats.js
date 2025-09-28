// This file's pourpouse is: Stats tracking and data persistence module
// All statistics-related functionality for the Pomodoro Timer including storing data for work and break times

// Global variables that need to be accessible from main.js
let currentTimerSession = null;

// --- Stats Modal ---
const statsBtn = document.getElementById('statsBtn');
const statsModal = document.getElementById('statsModal');
const closeStatsModal = document.getElementById('closeStatsModal');
const statsChart = document.getElementById('statsChart');

// Download controls
const downloadCsvBtn = document.getElementById('downloadCsvBtn');
const downloadChartBtn = document.getElementById('downloadChartBtn');

// Time view controls
const hourlyViewBtn = document.getElementById('hourlyView');
const quarterlyViewBtn = document.getElementById('quarterlyView');
const halfViewBtn = document.getElementById('halfView');
const dailyViewBtn = document.getElementById('dailyView');
const weeklyViewBtn = document.getElementById('weeklyView');
const monthlyViewBtn = document.getElementById('monthlyView');

let currentTimeView = 'hourly'; // Default to hourly view

// Download CSV function
function downloadSessionsCSV() {
    const data = JSON.parse(localStorage.getItem('pomodoroData')) || {};
    const sessions = data.sessions || [];
    
    if (sessions.length === 0) {
        alert('No session data available to download.');
        return;
    }
    
    // CSV headers
    const headers = [
        'Date',
        'Start Time', 
        'End Time',
        'Type',
        'Duration (minutes)',
        'Status',
        'Completed',
        'Skipped'
    ];
    
    // Convert sessions to CSV rows
    const rows = sessions.map(session => {
        const startDate = new Date(session.start);
        const endDate = new Date(session.end);
        const duration = ((session.end - session.start) / 1000 / 60).toFixed(2);
        
        let status = 'Completed';
        if (session.skipped) status = 'Skipped';
        else if (session.completed === false) status = 'Incomplete';
        
        return [
            startDate.toLocaleDateString(),
            startDate.toLocaleTimeString(),
            endDate.toLocaleTimeString(),
            session.type.charAt(0).toUpperCase() + session.type.slice(1),
            duration,
            status,
            session.completed !== false ? 'Yes' : 'No',
            session.skipped ? 'Yes' : 'No'
        ];
    });
    
    // Combine headers and data
    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pomodoro-sessions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Download Chart as PNG function
function downloadChartAsPNG() {
    // Temporarily switch to daily view for download if not already
    const originalView = currentTimeView;
    const needsViewChange = currentTimeView !== 'daily';
    
    if (needsViewChange) {
        currentTimeView = 'daily';
        renderStatsChart();
    }
    
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions
    const chartContainer = document.getElementById('statsChart');
    const containerRect = chartContainer.getBoundingClientRect();
    canvas.width = 800;
    canvas.height = 400;
    
    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Pomodoro Sessions - 24 Hour View', canvas.width / 2, 30);
    
    // Draw subtitle with date
    ctx.font = '14px Arial';
    ctx.fillText(new Date().toLocaleDateString(), canvas.width / 2, 50);
    
    // Chart area dimensions
    const chartX = 80;
    const chartY = 80;
    const chartWidth = canvas.width - 160;
    const chartHeight = 240;
    
    // Get data
    const data = JSON.parse(localStorage.getItem('pomodoroData')) || {};
    const sessions = data.sessions || [];
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const totalMinutesInDay = 24 * 60;
    
    // Filter sessions for today
    const todaySessions = sessions.filter(s => s.start >= startOfDay && s.start < startOfDay + (totalMinutesInDay * 60 * 1000));
    
    // Categories
    const categories = [
        { name: 'Work', type: 'work', color: '#e57373' },
        { name: 'Short Break', type: 'short', color: '#65a2ff' },
        { name: 'Long Break', type: 'long', color: '#81c784' }
    ];
    
    const rowHeight = chartHeight / categories.length;
    
    // Draw category labels and bars
    categories.forEach((cat, index) => {
        const y = chartY + (index * rowHeight);
        
        // Draw category label
        ctx.fillStyle = '#333333';
        ctx.font = '14px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(cat.name, chartX - 10, y + (rowHeight / 2) + 5);
        
        // Draw horizontal grid line
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartX, y + rowHeight);
        ctx.lineTo(chartX + chartWidth, y + rowHeight);
        ctx.stroke();
        
        // Draw bars for this category
        todaySessions
            .filter(s => s.type === cat.type)
            .forEach(session => {
                const startMinute = (session.start - startOfDay) / (1000 * 60);
                const endMinute = (session.end - startOfDay) / (1000 * 60);
                
                const barX = chartX + (startMinute / totalMinutesInDay) * chartWidth;
                const barWidth = ((endMinute - startMinute) / totalMinutesInDay) * chartWidth;
                const barY = y + 10;
                const barHeight = rowHeight - 20;
                
                // Set color based on session status
                if (session.skipped) {
                    ctx.fillStyle = '#999999';
                } else {
                    ctx.fillStyle = cat.color;
                }
                
                // Draw bar
                ctx.fillRect(barX, barY, barWidth, barHeight);
                
                // Draw border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(barX, barY, barWidth, barHeight);
            });
    });
    
    // Draw chart border
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.strokeRect(chartX, chartY, chartWidth, chartHeight);
    
    // Draw time labels (every 2 hours for better granularity)
    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    for (let hour = 0; hour <= 24; hour += 2) {
        const x = chartX + (hour / 24) * chartWidth;
        ctx.fillText(`${hour}:00`, x, chartY + chartHeight + 20);
        
        // Draw vertical grid lines (lighter for 2-hour intervals)
        if (hour > 0 && hour < 24) {
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, chartY);
            ctx.lineTo(x, chartY + chartHeight);
            ctx.stroke();
        }
    }
    
    // Add lighter grid lines for hourly intervals
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.5;
    for (let hour = 1; hour < 24; hour++) {
        if (hour % 2 !== 0) { // Only draw for odd hours (1, 3, 5, etc.)
            const x = chartX + (hour / 24) * chartWidth;
            ctx.beginPath();
            ctx.moveTo(x, chartY);
            ctx.lineTo(x, chartY + chartHeight);
            ctx.stroke();
        }
    }
    
    // Draw legend
    const legendY = chartY + chartHeight + 60;
    let legendX = chartX;
    
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    
    categories.forEach((cat, index) => {
        // Color box
        ctx.fillStyle = cat.color;
        ctx.fillRect(legendX, legendY, 15, 15);
        
        // Label
        ctx.fillStyle = '#333333';
        ctx.fillText(cat.name, legendX + 20, legendY + 12);
        
        legendX += ctx.measureText(cat.name).width + 40;
    });
    
    // Add skipped indicator
    ctx.fillStyle = '#999999';
    ctx.fillRect(legendX, legendY, 15, 15);
    ctx.fillStyle = '#333333';
    ctx.fillText('Skipped', legendX + 20, legendY + 12);
    
    // Convert canvas to blob and download
    canvas.toBlob(function(blob) {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `pomodoro-chart-${new Date().toISOString().split('T')[0]}.png`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Restore original view if it was changed
        if (needsViewChange) {
            currentTimeView = originalView;
            renderStatsChart();
        }
    });
}

function renderStatsChart() {
    statsChart.innerHTML = ''; // Clear previous chart

    const data = JSON.parse(localStorage.getItem('pomodoroData')) || {};
    const sessions = data.sessions || [];

    if (currentTimeView === 'weekly') {
        renderWeeklyChart(sessions);
    } else if (currentTimeView === 'monthly') {
        renderMonthlyChart(sessions);
    } else {
        renderTimelineChart(sessions);
    }
}

function renderTimelineChart(sessions) {
    const now = new Date();
    let startOfPeriod, totalMinutesInPeriod, stepSize, stepLabel;
    
    // Configure view based on current selection
    switch (currentTimeView) {
        case 'hourly':
            startOfPeriod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();
            totalMinutesInPeriod = 60;
            stepSize = 15; // 15-minute intervals
            stepLabel = 'min';
            break;
        case 'quarterly':
            const currentHour = now.getHours();
            const quarterStart = Math.floor(currentHour / 6) * 6;
            startOfPeriod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), quarterStart).getTime();
            totalMinutesInPeriod = 6 * 60; // 6 hours
            stepSize = 60; // 1-hour intervals
            stepLabel = 'hr';
            break;
        case 'half':
            const halfStart = now.getHours() < 12 ? 0 : 12;
            startOfPeriod = new Date(now.getFullYear(), now.getMonth(), now.getDate(), halfStart).getTime();
            totalMinutesInPeriod = 12 * 60; // 12 hours
            stepSize = 120; // 2-hour intervals
            stepLabel = 'hr';
            break;
        case 'daily':
        default:
            startOfPeriod = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            totalMinutesInPeriod = 24 * 60; // 24 hours
            stepSize = 240; // 4-hour intervals
            stepLabel = 'hr';
            break;
    }

    // Set up grid layout for timeline charts
    statsChart.style.display = 'grid';
    statsChart.style.gridTemplateColumns = '100px 1fr';
    statsChart.style.gridTemplateRows = 'repeat(3, 1fr) 20px';
    statsChart.style.height = '220px';

    // Filter sessions for the selected time period
    const periodSessions = sessions.filter(s => s.start >= startOfPeriod && s.start < startOfPeriod + (totalMinutesInPeriod * 60 * 1000));

    // Define categories, create rows, and set bar colour
    const categories = [
        { name: 'Work', type: 'work', color: '#e57373' },
        { name: 'Short Break', type: 'short', color: '#65a2ff' },
        { name: 'Long Break', type: 'long', color: '#81c784' }
    ];

    categories.forEach((cat, index) => {
        // Y-axis Label
        const yLabel = document.createElement('div');
        yLabel.className = 'chart-y-label';
        yLabel.textContent = cat.name;
        yLabel.style.gridRow = index + 1;
        statsChart.appendChild(yLabel);

        // Row for bars
        const row = document.createElement('div');
        row.className = 'chart-row';
        row.style.gridRow = index + 1;
        statsChart.appendChild(row);

        // Filter sessions for this category and create bars
        periodSessions
            .filter(s => s.type === cat.type)
            .forEach(session => {
                const startMinute = (session.start - startOfPeriod) / (1000 * 60);
                const endMinute = (session.end - startOfPeriod) / (1000 * 60);

                const left = (startMinute / totalMinutesInPeriod) * 100;
                const width = ((endMinute - startMinute) / totalMinutesInPeriod) * 100;

                const bar = document.createElement('div');
                bar.className = 'chart-bar';
                bar.style.left = `${left}%`;
                bar.style.width = `${width}%`;
                
                // Style based on whether session was completed or skipped
                if (session.skipped) {
                    bar.style.background = '#999999'; // Gray for skipped parts
                    bar.style.opacity = '0.6';
                    const duration = (session.end - session.start) / 1000 / 60;
                    bar.title = `SKIPPED ${cat.name}\nFrom ${new Date(session.start).toLocaleTimeString()} to ${new Date(session.end).toLocaleTimeString()}\nDuration: ${duration.toFixed(1)} minutes (skipped)`;
                } else {
                    bar.style.background = cat.color;
                    const duration = (session.end - session.start) / 1000 / 60;
                    const status = session.completed === false ? ' (incomplete)' : '';
                    bar.title = `${cat.name.toUpperCase()}\nFrom ${new Date(session.start).toLocaleTimeString()} to ${new Date(session.end).toLocaleTimeString()}\nDuration: ${duration.toFixed(1)} minutes${status}`;
                }
                
                // Add glow hover effects
                bar.addEventListener('mouseenter', function(e) {
                    this.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.6)';
                    this.style.transition = 'box-shadow 0.2s ease';
                    this.style.zIndex = '10';
                });
                
                bar.addEventListener('mousemove', function(e) {
                    const rect = this.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    // Create a radial glow effect centered on mouse position
                    const glowX = (x / rect.width) * 100;
                    const glowY = (y / rect.height) * 100;
                    
                    this.style.boxShadow = `
                        0 0 15px rgba(255, 255, 255, 0.9),
                        inset ${glowX - 50}% ${glowY - 50}% 30px rgba(255, 255, 255, 0.3)
                    `;
                });
                
                bar.addEventListener('mouseleave', function() {
                    this.style.boxShadow = 'none';
                    this.style.zIndex = '1';
                });
                
                row.appendChild(bar);
            });
    });

    // X-axis labels (time)
    const xLabels = document.createElement('div');
    xLabels.className = 'chart-labels-x';
    
    const numLabels = Math.ceil(totalMinutesInPeriod / stepSize) + 1;
    for (let i = 0; i < numLabels; i++) {
        const label = document.createElement('span');
        const minutesFromStart = i * stepSize;
        const labelTime = new Date(startOfPeriod + minutesFromStart * 60 * 1000);
        
        if (stepLabel === 'min') {
            label.textContent = labelTime.getMinutes() + 'min';
        } else {
            label.textContent = labelTime.getHours() + ':00';
        }
        
        xLabels.appendChild(label);
    }
    
    statsChart.appendChild(xLabels);
}

function renderWeeklyChart(sessions) {
    // Reset grid layout for weekly chart
    statsChart.style.display = 'block';
    statsChart.style.gridTemplateColumns = 'none';
    statsChart.style.gridTemplateRows = 'none';
    statsChart.style.height = 'auto';
    
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start from Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    // Filter sessions for this week
    const weekSessions = sessions.filter(s => s.start >= startOfWeek.getTime() && s.start < endOfWeek.getTime());
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekData = [];
    
    // Aggregate data by day
    for (let i = 0; i < 7; i++) {
        const dayStart = new Date(startOfWeek);
        dayStart.setDate(startOfWeek.getDate() + i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);
        
        const daySessions = weekSessions.filter(s => s.start >= dayStart.getTime() && s.start < dayEnd.getTime());
        
        const workTime = daySessions.filter(s => s.type === 'work' && !s.skipped).reduce((acc, s) => acc + (s.end - s.start), 0) / (1000 * 60 * 60); // hours
        const shortBreakTime = daySessions.filter(s => s.type === 'short' && !s.skipped).reduce((acc, s) => acc + (s.end - s.start), 0) / (1000 * 60 * 60);
        const longBreakTime = daySessions.filter(s => s.type === 'long' && !s.skipped).reduce((acc, s) => acc + (s.end - s.start), 0) / (1000 * 60 * 60);
        
        weekData.push({
            day: dayNames[i],
            work: workTime,
            shortBreak: shortBreakTime,
            longBreak: longBreakTime,
            total: workTime + shortBreakTime + longBreakTime
        });
    }
    
    // Create weekly bar chart
    const chartContainer = document.createElement('div');
    chartContainer.className = 'weekly-chart-container';
    chartContainer.style.padding = '20px';
    
    const title = document.createElement('h4');
    title.textContent = 'Hours per Day';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    title.style.color = '#333';
    chartContainer.appendChild(title);
    
    const maxHours = Math.max(...weekData.map(d => d.total), 1);
    const chartHeight = 200;
    
    const barsContainer = document.createElement('div');
    barsContainer.style.display = 'flex';
    barsContainer.style.justifyContent = 'space-around';
    barsContainer.style.alignItems = 'flex-end';
    barsContainer.style.height = chartHeight + 'px';
    barsContainer.style.background = '#f8f9fa';
    barsContainer.style.borderRadius = '8px';
    barsContainer.style.padding = '10px';
    barsContainer.style.border = '1px solid #e9ecef';
    
    weekData.forEach(dayData => {
        const barContainer = document.createElement('div');
        barContainer.style.display = 'flex';
        barContainer.style.flexDirection = 'column';
        barContainer.style.alignItems = 'center';
        barContainer.style.flex = '1';
        
        // Stacked bar container
        const stackedBar = document.createElement('div');
        stackedBar.style.display = 'flex';
        stackedBar.style.flexDirection = 'column';
        stackedBar.style.justifyContent = 'flex-end';
        stackedBar.style.height = (chartHeight - 20) + 'px';
        stackedBar.style.width = '30px';
        stackedBar.style.marginBottom = '5px';
        
        // Create stacked segments
        const segments = [
            { hours: dayData.work, color: '#e57373', name: 'Work' },
            { hours: dayData.shortBreak, color: '#65a2ff', name: 'Short Break' },
            { hours: dayData.longBreak, color: '#81c784', name: 'Long Break' }
        ];
        
        segments.reverse().forEach(segment => {
            if (segment.hours > 0) {
                const segmentDiv = document.createElement('div');
                segmentDiv.style.height = Math.max(2, (segment.hours / maxHours) * (chartHeight - 20)) + 'px';
                segmentDiv.style.background = segment.color;
                segmentDiv.style.borderRadius = '2px';
                segmentDiv.style.marginBottom = '1px';
                segmentDiv.title = `${segment.name}: ${segment.hours.toFixed(1)} hours`;
                stackedBar.appendChild(segmentDiv);
            }
        });
        
        barContainer.appendChild(stackedBar);
        
        // Day label
        const dayLabel = document.createElement('div');
        dayLabel.textContent = dayData.day;
        dayLabel.style.fontSize = '12px';
        dayLabel.style.fontWeight = 'bold';
        dayLabel.style.color = '#666';
        barContainer.appendChild(dayLabel);
        
        // Total hours label
        const totalLabel = document.createElement('div');
        totalLabel.textContent = dayData.total.toFixed(1) + 'h';
        totalLabel.style.fontSize = '10px';
        totalLabel.style.color = '#999';
        barContainer.appendChild(totalLabel);
        
        barsContainer.appendChild(barContainer);
    });
    
    chartContainer.appendChild(barsContainer);
    
    // Legend
    const legend = document.createElement('div');
    legend.style.display = 'flex';
    legend.style.justifyContent = 'center';
    legend.style.gap = '20px';
    legend.style.marginTop = '15px';
    legend.style.fontSize = '12px';
    
    const legendItems = [
        { color: '#e57373', name: 'Work' },
        { color: '#65a2ff', name: 'Short Break' },
        { color: '#81c784', name: 'Long Break' }
    ];
    
    legendItems.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.style.display = 'flex';
        legendItem.style.alignItems = 'center';
        legendItem.style.gap = '5px';
        
        const colorBox = document.createElement('div');
        colorBox.style.width = '12px';
        colorBox.style.height = '12px';
        colorBox.style.background = item.color;
        colorBox.style.borderRadius = '2px';
        
        const label = document.createElement('span');
        label.textContent = item.name;
        label.style.color = '#666';
        
        legendItem.appendChild(colorBox);
        legendItem.appendChild(label);
        legend.appendChild(legendItem);
    });
    
    chartContainer.appendChild(legend);
    statsChart.appendChild(chartContainer);
}

function renderMonthlyChart(sessions) {
    // Reset grid layout for monthly chart
    statsChart.style.display = 'block';
    statsChart.style.gridTemplateColumns = 'none';
    statsChart.style.gridTemplateRows = 'none';
    statsChart.style.height = 'auto';
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // Filter sessions for this month
    const monthSessions = sessions.filter(s => s.start >= startOfMonth.getTime() && s.start < endOfMonth.getTime());
    
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const monthData = [];
    
    // Aggregate data by day
    for (let day = 1; day <= daysInMonth; day++) {
        const dayStart = new Date(now.getFullYear(), now.getMonth(), day);
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), day + 1);
        
        const daySessions = monthSessions.filter(s => s.start >= dayStart.getTime() && s.start < dayEnd.getTime());
        
        const totalMinutes = daySessions.filter(s => !s.skipped).reduce((acc, s) => acc + (s.end - s.start), 0) / (1000 * 60);
        
        monthData.push({
            day: day,
            totalMinutes: totalMinutes,
            date: new Date(dayStart)
        });
    }
    
    // Create heatmap
    const chartContainer = document.createElement('div');
    chartContainer.className = 'monthly-heatmap-container';
    chartContainer.style.padding = '15px';
    chartContainer.style.maxHeight = '400px';
    chartContainer.style.overflowY = 'auto';
    
    const title = document.createElement('h4');
    title.textContent = `${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Activity Heatmap`;
    title.style.textAlign = 'center';
    title.style.marginBottom = '15px';
    title.style.color = '#333';
    title.style.fontSize = '16px';
    chartContainer.appendChild(title);
    
    // Calculate intensity levels
    const maxMinutes = Math.max(...monthData.map(d => d.totalMinutes), 1);
    
    // Create calendar grid
    const calendar = document.createElement('div');
    calendar.style.display = 'grid';
    calendar.style.gridTemplateColumns = 'repeat(7, 1fr)';
    calendar.style.gap = '1px';
    calendar.style.background = '#f8f9fa';
    calendar.style.padding = '8px';
    calendar.style.borderRadius = '6px';
    calendar.style.border = '1px solid #e9ecef';
    calendar.style.maxWidth = '350px';
    calendar.style.margin = '0 auto';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.textContent = day;
        header.style.textAlign = 'center';
        header.style.fontSize = '10px';
        header.style.fontWeight = 'bold';
        header.style.color = '#666';
        header.style.padding = '3px';
        calendar.appendChild(header);
    });
    
    // Add empty cells for days before month starts
    const firstDayOfWeek = startOfMonth.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.style.aspectRatio = '1';
        calendar.appendChild(emptyCell);
    }
    
    // Add day cells
    monthData.forEach(dayData => {
        const cell = document.createElement('div');
        cell.style.aspectRatio = '1';
        cell.style.borderRadius = '2px';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.fontSize = '9px';
        cell.style.fontWeight = 'bold';
        cell.style.cursor = 'pointer';
        cell.style.transition = 'transform 0.2s ease';
        cell.style.minHeight = '20px';
        cell.style.maxHeight = '30px';
        cell.textContent = dayData.day;
        
        // Calculate intensity (0-4 levels)
        const intensity = Math.ceil((dayData.totalMinutes / maxMinutes) * 4);
        
        if (dayData.totalMinutes === 0) {
            cell.style.background = '#f0f0f0';
            cell.style.color = '#999';
        } else {
            const colors = ['#f0f0f0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
            cell.style.background = colors[Math.min(intensity, 4)];
            cell.style.color = intensity > 2 ? 'white' : '#333';
        }
        
        const hours = dayData.totalMinutes / 60;
        cell.title = `${dayData.date.toLocaleDateString()}\n${hours.toFixed(1)} hours of activity`;
        
        cell.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
        });
        
        cell.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
        
        calendar.appendChild(cell);
    });
    
    chartContainer.appendChild(calendar);
    
    // Legend for heatmap
    const legend = document.createElement('div');
    legend.style.display = 'flex';
    legend.style.justifyContent = 'center';
    legend.style.alignItems = 'center';
    legend.style.gap = '10px';
    legend.style.marginTop = '15px';
    legend.style.fontSize = '12px';
    legend.style.color = '#666';
    
    const lessLabel = document.createElement('span');
    lessLabel.textContent = 'Less';
    legend.appendChild(lessLabel);
    
    const colors = ['#f0f0f0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
    colors.forEach(color => {
        const colorBox = document.createElement('div');
        colorBox.style.width = '12px';
        colorBox.style.height = '12px';
        colorBox.style.background = color;
        colorBox.style.borderRadius = '2px';
        legend.appendChild(colorBox);
    });
    
    const moreLabel = document.createElement('span');
    moreLabel.textContent = 'More';
    legend.appendChild(moreLabel);
    
    chartContainer.appendChild(legend);
    
    // Summary stats
    const totalHours = monthData.reduce((acc, d) => acc + d.totalMinutes, 0) / 60;
    const activeDays = monthData.filter(d => d.totalMinutes > 0).length;
    const avgHoursPerActiveDay = activeDays > 0 ? totalHours / activeDays : 0;
    
    const summary = document.createElement('div');
    summary.style.display = 'grid';
    summary.style.gridTemplateColumns = 'repeat(auto-fit, minmax(100px, 1fr))';
    summary.style.gap = '8px';
    summary.style.marginTop = '15px';
    summary.style.fontSize = '11px';
    
    const summaryItems = [
        { label: 'Total Hours', value: totalHours.toFixed(1) + 'h' },
        { label: 'Active Days', value: `${activeDays}/${daysInMonth}` },
        { label: 'Avg per Active Day', value: avgHoursPerActiveDay.toFixed(1) + 'h' }
    ];
    
    summaryItems.forEach(item => {
        const summaryItem = document.createElement('div');
        summaryItem.style.textAlign = 'center';
        summaryItem.style.padding = '10px';
        summaryItem.style.background = 'white';
        summaryItem.style.borderRadius = '6px';
        summaryItem.style.border = '1px solid #e9ecef';
        
        const value = document.createElement('div');
        value.textContent = item.value;
        value.style.fontSize = '14px';
        value.style.fontWeight = 'bold';
        value.style.color = '#333';
        value.style.marginBottom = '2px';
        
        const label = document.createElement('div');
        label.textContent = item.label;
        label.style.color = '#666';
        
        summaryItem.appendChild(value);
        summaryItem.appendChild(label);
        summary.appendChild(summaryItem);
    });
    
    chartContainer.appendChild(summary);
    statsChart.appendChild(chartContainer);
}

// Show stats modal
function showStatsModal() {
    // Update title based on current view
    const titleElement = document.querySelector('.stats-modal-header h3');
    const viewTitles = {
        'hourly': 'This Hour\'s Activity',
        'quarterly': 'Last 6 Hours Activity', 
        'half': 'Last 12 Hours Activity',
        'daily': 'Today\'s Activity'
    };
    if (titleElement) {
        titleElement.textContent = viewTitles[currentTimeView] || 'Activity';
    }
    
    renderStatsChart();
    statsModal.style.display = 'flex';
}

function closeStatsModalFunc() {
    statsModal.style.display = 'none';
}

// Event listeners for stats modal
if (statsBtn && statsModal && closeStatsModal) {
    statsBtn.onclick = showStatsModal;
    closeStatsModal.onclick = closeStatsModalFunc;
    statsModal.onclick = (e) => {
        if (e.target === statsModal) {
            closeStatsModalFunc();
        }
    };
}

// Event listeners for download buttons
if (downloadCsvBtn) {
    downloadCsvBtn.onclick = downloadSessionsCSV;
}

if (downloadChartBtn) {
    downloadChartBtn.onclick = downloadChartAsPNG;
}

// Event listeners for time view controls
function setActiveTimeView(selectedView) {
    currentTimeView = selectedView;
    
    // Update button states
    document.querySelectorAll('.time-view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(selectedView + 'View').classList.add('active');
    
    // Update title
    const titleElement = document.querySelector('.stats-modal-header h3');
    const viewTitles = {
        'hourly': 'This Hour\'s Activity',
        'quarterly': 'Last 6 Hours Activity', 
        'half': 'Last 12 Hours Activity',
        'daily': 'Today\'s Activity',
        'weekly': 'This Week\'s Activity',
        'monthly': 'This Month\'s Activity'
    };
    if (titleElement) {
        titleElement.textContent = viewTitles[selectedView] || 'Activity';
    }
    
    // Re-render chart
    renderStatsChart();
}

if (hourlyViewBtn) hourlyViewBtn.onclick = () => setActiveTimeView('hourly');
if (quarterlyViewBtn) quarterlyViewBtn.onclick = () => setActiveTimeView('quarterly');
if (halfViewBtn) halfViewBtn.onclick = () => setActiveTimeView('half');
if (dailyViewBtn) dailyViewBtn.onclick = () => setActiveTimeView('daily');
if (weeklyViewBtn) weeklyViewBtn.onclick = () => setActiveTimeView('weekly');
if (monthlyViewBtn) monthlyViewBtn.onclick = () => setActiveTimeView('monthly');

// --- Data Persistence using localStorage ---

function saveData(pomodoroAppState) {
    const existingData = JSON.parse(localStorage.getItem('pomodoroData') || '{}');
    
    const data = {
        workDuration: pomodoroAppState.workDuration,
        shortBreak: pomodoroAppState.shortBreak,
        longBreak: pomodoroAppState.longBreak,
        intervals: pomodoroAppState.intervals,
        pomodoros: pomodoroAppState.pomodoros,
        skippedPomodoros: pomodoroAppState.skippedPomodoros,
        totalWorkTime: pomodoroAppState.totalWorkTime,
        totalShortBreakTime: pomodoroAppState.totalShortBreakTime,
        totalLongBreakTime: pomodoroAppState.totalLongBreakTime,
        tasks: pomodoroAppState.tasks,
        sessions: existingData.sessions || [],
        timerState: {
            remaining: pomodoroAppState.timer,
            state: pomodoroAppState.state,
            isRunning: pomodoroAppState.timerInterval !== null,
            endTimestamp: pomodoroAppState.timerEndTimestamp
        }
    };
    localStorage.setItem('pomodoroData', JSON.stringify(data));
}

function loadData() {
    const data = JSON.parse(localStorage.getItem('pomodoroData'));
    if (!data) return null;

    return {
        workDuration: data.workDuration || 25,
        shortBreak: data.shortBreak || 5,
        longBreak: data.longBreak || 15,
        intervals: data.intervals || 4,
        pomodoros: data.pomodoros || 0,
        skippedPomodoros: data.skippedPomodoros || 0,
        totalWorkTime: data.totalWorkTime || 0,
        totalShortBreakTime: data.totalShortBreakTime || 0,
        totalLongBreakTime: data.totalLongBreakTime || 0,
        tasks: data.tasks || [],
        timerState: data.timerState || null
    };
}

// Session tracking functions
function startSession(type) {
    // End any existing session first
    if (currentTimerSession) {
        endSession();
    }
    
    currentTimerSession = {
        type: type,
        start: Date.now()
    };
    console.log(`Started ${type} session at ${new Date().toLocaleTimeString()}`);
}

function endSession() {
    if (currentTimerSession) {
        currentTimerSession.end = Date.now();
        
        const duration = (currentTimerSession.end - currentTimerSession.start) / 1000 / 60; // in minutes
        console.log(`Ended ${currentTimerSession.type} session after ${duration.toFixed(1)} minutes`);
        
        // Add to sessions array
        const data = JSON.parse(localStorage.getItem('pomodoroData') || '{}');
        if (!data.sessions) data.sessions = [];
        data.sessions.push(currentTimerSession);
        localStorage.setItem('pomodoroData', JSON.stringify(data));
        
        currentTimerSession = null;
    }
}

// Skip session - records both completed and skipped parts for showing on the graph
function skipSession() {
    if (currentTimerSession) {
        const now = Date.now();
        const actualDuration = now - currentTimerSession.start;
        
        // Get expected duration based on session type (work/break)
        let expectedDuration;
        if (currentTimerSession.type === 'work') {
            expectedDuration = (window.workDuration || 25) * 60 * 1000;
        } else if (currentTimerSession.type === 'short') {
            expectedDuration = (window.shortBreak || 5) * 60 * 1000;
        } else {
            expectedDuration = (window.longBreak || 15) * 60 * 1000;
        }
        
        console.log(`Skipped ${currentTimerSession.type} session after ${(actualDuration / 1000 / 60).toFixed(1)} minutes (expected ${expectedDuration / 1000 / 60} minutes)`);
        
        const data = JSON.parse(localStorage.getItem('pomodoroData') || '{}');
        if (!data.sessions) data.sessions = [];
        
        // Add the completed part
        data.sessions.push({
            type: currentTimerSession.type,
            start: currentTimerSession.start,
            end: now,
            completed: true
        });
        
        // Add the skipped part (if there was remaining time)
        if (actualDuration < expectedDuration) {
            data.sessions.push({
                type: currentTimerSession.type,
                start: now,
                end: currentTimerSession.start + expectedDuration,
                completed: false,
                skipped: true
            });
        }
        
        localStorage.setItem('pomodoroData', JSON.stringify(data));
        currentTimerSession = null;
    }
}

// Add a function to check and complete any incomplete session
function completeCurrentSession() {
    if (currentTimerSession && !currentTimerSession.end) {
        endSession();
    }
}

// Test function for generating fake sessions
// Generates fake sessions using the current user-configured durations (workDuration, shortBreak, longBreak) and intervals.
function generateFakeSessions() {
    // Get current app state from main.js if available
    const workDuration = window.workDuration || 25;
    const shortBreak = window.shortBreak || 5;
    const longBreak = window.longBreak || 15;
    const intervals = window.intervals || 4;

    const sessions = [];
    const now = new Date();
    // Start generating data from 3 hours ago
    let currentTime = now.getTime() - 3 * 60 * 60 * 1000;

    // Use current configured durations (they are in minutes in the app)
    const workMs = Math.max(1, workDuration) * 60 * 1000;
    const shortMs = Math.max(1, shortBreak) * 60 * 1000;
    const longMs = Math.max(1, longBreak) * 60 * 1000;

    // Number of pomodoro cycles to generate (at least 1)
    const cycles = Math.max(1, intervals);

    for (let i = 0; i < cycles; i++) {
        // Work Session - sometimes skip it for demo
        let start = currentTime;
        let shouldSkip = Math.random() < 0.3; // 30% chance to skip
        
        if (shouldSkip) {
            // Add completed part (70% of expected time)
            let partialEnd = start + workMs * 0.7;
            sessions.push({ 
                type: 'work', 
                start, 
                end: partialEnd, 
                completed: true 
            });
            
            // Add skipped part
            let fullEnd = start + workMs;
            sessions.push({ 
                type: 'work', 
                start: partialEnd, 
                end: fullEnd, 
                completed: false, 
                skipped: true 
            });
            currentTime = fullEnd;
        } else {
            let end = start + workMs;
            sessions.push({ type: 'work', start, end, completed: true });
            currentTime = end;
        }

        // Break Session: make the last break a long one
        start = currentTime;
        let breakMs = (i === cycles - 1) ? longMs : shortMs;
        let breakType = (i === cycles - 1) ? 'long' : 'short';
        
        // Breaks are less likely to be skipped
        shouldSkip = Math.random() < 0.15; // 15% chance to skip
        
        if (shouldSkip) {
            // Add completed part (50% of expected time)
            let partialEnd = start + breakMs * 0.5;
            sessions.push({ 
                type: breakType, 
                start, 
                end: partialEnd, 
                completed: true 
            });
            
            // Add skipped part
            let fullEnd = start + breakMs;
            sessions.push({ 
                type: breakType, 
                start: partialEnd, 
                end: fullEnd, 
                completed: false, 
                skipped: true 
            });
            currentTime = fullEnd;
        } else {
            let end = start + breakMs;
            sessions.push({ type: breakType, start, end, completed: true });
            currentTime = end;
        }
    }

    // Save the fake data to localStorage (preserve other saved fields if present)
    const data = JSON.parse(localStorage.getItem('pomodoroData')) || {};
    data.sessions = sessions;
    localStorage.setItem('pomodoroData', JSON.stringify(data));

    console.log(`✅ Fake session data generated using work=${workDuration}min, short=${shortBreak}min, long=${longBreak}min, cycles=${cycles}`);
    console.log(`Generated ${sessions.length} session records (including ${sessions.filter(s => s.skipped).length} skipped segments)`);
    alert('Fake session data has been generated! Please open the stats modal to see the chart with skipped sessions in gray.');

    // Automatically refresh the chart if it's open
    if (document.getElementById('statsModal').style.display === 'flex') {
        renderStatsChart();
    }
}

// Test function for generating fake weekly data
// Generates fake sessions for the past week with varying activity levels
function generateFakeWeeklyData() {
    const workDuration = window.workDuration || 25;
    const shortBreak = window.shortBreak || 5;
    const longBreak = window.longBreak || 15;
    const intervals = window.intervals || 4;

    const sessions = [];
    const now = new Date();
    
    // Start from beginning of this week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(9, 0, 0, 0); // Start at 9 AM
    
    const workMs = workDuration * 60 * 1000;
    const shortMs = shortBreak * 60 * 1000;
    const longMs = longBreak * 60 * 1000;
    
    // Generate data for each day of the week
    for (let day = 0; day < 7; day++) {
        const dayStart = new Date(startOfWeek);
        dayStart.setDate(startOfWeek.getDate() + day);
        
        // Vary activity by day (less on weekends)
        const isWeekend = day === 0 || day === 6;
        const sessionsThisDay = isWeekend ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 6) + 2;
        
        let currentTime = dayStart.getTime();
        
        for (let session = 0; session < sessionsThisDay; session++) {
            // Add some random gaps between sessions (5-60 minutes)
            if (session > 0) {
                currentTime += (Math.random() * 55 + 5) * 60 * 1000;
            }
            
            for (let cycle = 0; cycle < intervals; cycle++) {
                // Work session
                let start = currentTime;
                let shouldSkip = Math.random() < 0.2; // 20% chance to skip
                
                if (shouldSkip) {
                    let partialEnd = start + workMs * (0.3 + Math.random() * 0.4); // 30-70% completion
                    sessions.push({ type: 'work', start, end: partialEnd, completed: true });
                    
                    let fullEnd = start + workMs;
                    sessions.push({ type: 'work', start: partialEnd, end: fullEnd, completed: false, skipped: true });
                    currentTime = fullEnd;
                } else {
                    let end = start + workMs;
                    sessions.push({ type: 'work', start, end, completed: true });
                    currentTime = end;
                }
                
                // Break session (if not last cycle)
                if (cycle < intervals - 1) {
                    start = currentTime;
                    let breakMs = (cycle === intervals - 1) ? longMs : shortMs;
                    let breakType = (cycle === intervals - 1) ? 'long' : 'short';
                    
                    shouldSkip = Math.random() < 0.1; // 10% chance to skip breaks
                    
                    if (shouldSkip) {
                        let partialEnd = start + breakMs * 0.5;
                        sessions.push({ type: breakType, start, end: partialEnd, completed: true });
                        
                        let fullEnd = start + breakMs;
                        sessions.push({ type: breakType, start: partialEnd, end: fullEnd, completed: false, skipped: true });
                        currentTime = fullEnd;
                    } else {
                        let end = start + breakMs;
                        sessions.push({ type: breakType, start, end, completed: true });
                        currentTime = end;
                    }
                }
            }
        }
    }

    const data = JSON.parse(localStorage.getItem('pomodoroData')) || {};
    data.sessions = sessions;
    localStorage.setItem('pomodoroData', JSON.stringify(data));

    console.log(`✅ Fake weekly data generated: ${sessions.length} sessions across 7 days`);
    alert('Fake weekly data generated! Switch to Weekly view in stats to see the results.');
    
    if (document.getElementById('statsModal').style.display === 'flex') {
        renderStatsChart();
    }
}

// Test function for generating fake monthly data
// Generates fake sessions for the current month with realistic patterns
function generateFakeMonthlyData() {
    const workDuration = window.workDuration || 25;
    const shortBreak = window.shortBreak || 5;
    const longBreak = window.longBreak || 15;
    const intervals = window.intervals || 4;

    const sessions = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const workMs = workDuration * 60 * 1000;
    const shortMs = shortBreak * 60 * 1000;
    const longMs = longBreak * 60 * 1000;
    
    // Generate data for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(currentYear, currentMonth, day);
        const dayOfWeek = dayDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Skip some days randomly (simulating days off)
        if (Math.random() < (isWeekend ? 0.6 : 0.2)) continue;
        
        // Vary start time (8 AM to 10 AM)
        const startHour = 8 + Math.random() * 2;
        const dayStart = new Date(currentYear, currentMonth, day, Math.floor(startHour), Math.floor((startHour % 1) * 60));
        
        // Vary number of pomodoro cycles per day (1-8 for weekdays, 1-4 for weekends)
        const maxCycles = isWeekend ? 4 : 8;
        const cyclesThisDay = Math.floor(Math.random() * maxCycles) + 1;
        
        let currentTime = dayStart.getTime();
        
        for (let cycleSet = 0; cycleSet < cyclesThisDay; cycleSet++) {
            // Add random breaks between cycle sets (15-120 minutes)
            if (cycleSet > 0) {
                currentTime += (Math.random() * 105 + 15) * 60 * 1000;
            }
            
            // Do a full pomodoro cycle
            for (let cycle = 0; cycle < intervals; cycle++) {
                // Work session
                let start = currentTime;
                let shouldSkip = Math.random() < 0.15; // 15% chance to skip
                
                if (shouldSkip) {
                    let partialEnd = start + workMs * (0.4 + Math.random() * 0.3); // 40-70% completion
                    sessions.push({ type: 'work', start, end: partialEnd, completed: true });
                    
                    let fullEnd = start + workMs;
                    sessions.push({ type: 'work', start: partialEnd, end: fullEnd, completed: false, skipped: true });
                    currentTime = fullEnd;
                } else {
                    let end = start + workMs;
                    sessions.push({ type: 'work', start, end, completed: true });
                    currentTime = end;
                }
                
                // Break session
                start = currentTime;
                let breakMs = (cycle === intervals - 1) ? longMs : shortMs;
                let breakType = (cycle === intervals - 1) ? 'long' : 'short';
                
                shouldSkip = Math.random() < 0.08; // 8% chance to skip breaks
                
                if (shouldSkip) {
                    let partialEnd = start + breakMs * 0.6;
                    sessions.push({ type: breakType, start, end: partialEnd, completed: true });
                    
                    let fullEnd = start + breakMs;
                    sessions.push({ type: breakType, start: partialEnd, end: fullEnd, completed: false, skipped: true });
                    currentTime = fullEnd;
                } else {
                    let end = start + breakMs;
                    sessions.push({ type: breakType, start, end, completed: true });
                    currentTime = end;
                }
            }
        }
    }

    const data = JSON.parse(localStorage.getItem('pomodoroData')) || {};
    data.sessions = sessions;
    localStorage.setItem('pomodoroData', JSON.stringify(data));

    const activeDays = new Set(sessions.map(s => new Date(s.start).toDateString())).size;
    console.log(`✅ Fake monthly data generated: ${sessions.length} sessions across ${activeDays} active days`);
    alert(`Fake monthly data generated! ${sessions.length} sessions across ${activeDays} days. Switch to Monthly view in stats to see the heatmap.`);
    
    if (document.getElementById('statsModal').style.display === 'flex') {
        renderStatsChart();
    }
}

// Export functions to be used by main.js
window.PomodoroStats = {
    saveData,
    loadData,
    startSession,
    endSession,
    skipSession,
    completeCurrentSession,
    generateFakeSessions,
    generateFakeWeeklyData,
    generateFakeMonthlyData,
    showStatsModal,
    closeStatsModal: closeStatsModalFunc,
    get currentTimerSession() { return currentTimerSession; }
};