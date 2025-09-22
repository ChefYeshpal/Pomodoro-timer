// Stats tracking and data persistence module
// All statistics-related functionality for the Pomodoro Timer

// Global variables that need to be accessible from main.js
let currentTimerSession = null;

// --- Stats Modal ---
const statsBtn = document.getElementById('statsBtn');
const statsModal = document.getElementById('statsModal');
const closeStatsModal = document.getElementById('closeStatsModal');
const statsChart = document.getElementById('statsChart');

function renderStatsChart() {
    statsChart.innerHTML = ''; // Clear previous chart (24 hours)

    const data = JSON.parse(localStorage.getItem('pomodoroData')) || {};
    const sessions = data.sessions || [];

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const totalMinutesInDay = 24 * 60;

    // Define categories and create rows
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
        sessions
            .filter(s => s.type === cat.type && s.start >= startOfDay)
            .forEach(session => {
                const startMinute = (session.start - startOfDay) / (1000 * 60);
                const endMinute = (session.end - startOfDay) / (1000 * 60);

                const left = (startMinute / totalMinutesInDay) * 100;
                const width = ((endMinute - startMinute) / totalMinutesInDay) * 100;

                const bar = document.createElement('div');
                bar.className = 'chart-bar';
                bar.style.left = `${left}%`;
                bar.style.width = `${width}%`;
                bar.style.background = cat.color;
                bar.title = `From ${new Date(session.start).toLocaleTimeString()} to ${new Date(session.end).toLocaleTimeString()}`;
                row.appendChild(bar);
            });
    });

    // X-axis labels (time)
    const xLabels = document.createElement('div');
    xLabels.className = 'chart-labels-x';
    for (let i = 0; i <= 24; i += 4) {
        const label = document.createElement('span');
        label.textContent = `${i}:00`;
        xLabels.appendChild(label);
    }
    statsChart.appendChild(xLabels);
}

function showStatsModal() {
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
    currentTimerSession = {
        type: type,
        start: Date.now()
    };
}

function endSession() {
    if (currentTimerSession) {
        currentTimerSession.end = Date.now();
        
        // Add to sessions array
        const data = JSON.parse(localStorage.getItem('pomodoroData') || '{}');
        if (!data.sessions) data.sessions = [];
        data.sessions.push(currentTimerSession);
        localStorage.setItem('pomodoroData', JSON.stringify(data));
        
        currentTimerSession = null;
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
        // Work Session
        let start = currentTime;
        let end = start + workMs;
        sessions.push({ type: 'work', start, end });
        currentTime = end;

        // Break Session: make the last break a long one
        start = currentTime;
        if (i === cycles - 1) {
            end = start + longMs;
            sessions.push({ type: 'long', start, end });
        } else {
            end = start + shortMs;
            sessions.push({ type: 'short', start, end });
        }
        currentTime = end;
    }

    // Save the fake data to localStorage (preserve other saved fields if present)
    const data = JSON.parse(localStorage.getItem('pomodoroData')) || {};
    data.sessions = sessions;
    localStorage.setItem('pomodoroData', JSON.stringify(data));

    console.log(`✅ Fake session data generated using work=${workDuration}min, short=${shortBreak}min, long=${longBreak}min, cycles=${cycles}`);
    alert('Fake session data has been generated! Please open the stats modal to see the chart.');

    // Automatically refresh the chart if it's open
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
    generateFakeSessions,
    showStatsModal,
    closeStatsModal: closeStatsModalFunc
};