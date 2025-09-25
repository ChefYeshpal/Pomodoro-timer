// Enhanced Statistics Module
// Provides advanced analytics and insights for Pomodoro sessions

class EnhancedStats {
    constructor() {
        this.enhancedStatsBtn = document.getElementById('enhancedStatsBtn');
        this.enhancedStatsModal = document.getElementById('enhancedStatsModal');
        this.closeEnhancedStatsModal = document.getElementById('closeEnhancedStatsModal');
        this.enhancedStatsContent = document.getElementById('enhancedStatsContent');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        if (this.enhancedStatsBtn) {
            this.enhancedStatsBtn.addEventListener('click', () => {
                this.showEnhancedStats();
            });
        }

        if (this.closeEnhancedStatsModal) {
            this.closeEnhancedStatsModal.addEventListener('click', () => {
                this.hideEnhancedStats();
            });
        }

        if (this.enhancedStatsModal) {
            this.enhancedStatsModal.addEventListener('click', (e) => {
                if (e.target === this.enhancedStatsModal) {
                    this.hideEnhancedStats();
                }
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.enhancedStatsModal.style.display === 'flex') {
                this.hideEnhancedStats();
            }
        });
    }

    showEnhancedStats() {
        this.renderEnhancedStats();
        this.enhancedStatsModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    hideEnhancedStats() {
        this.enhancedStatsModal.style.display = 'none';
        document.body.style.overflow = ''; // Restore scrolling
    }

    getSessionData() {
        const data = JSON.parse(localStorage.getItem('pomodoroData')) || {};
        return data.sessions || [];
    }

    calculateBasicStats(sessions) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const todaySessions = sessions.filter(s => new Date(s.start) >= today && !s.skipped);
        const weekSessions = sessions.filter(s => new Date(s.start) >= thisWeek && !s.skipped);
        const monthSessions = sessions.filter(s => new Date(s.start) >= thisMonth && !s.skipped);

        const workSessions = sessions.filter(s => s.type === 'work' && !s.skipped);
        const totalWorkTime = workSessions.reduce((sum, s) => sum + (s.end - s.start), 0) / (1000 * 60); // minutes
        const avgSessionLength = workSessions.length > 0 ? totalWorkTime / workSessions.length : 0;

        const skippedSessions = sessions.filter(s => s.skipped);
        const completionRate = sessions.length > 0 ? ((sessions.length - skippedSessions.length) / sessions.length * 100) : 100;

        return {
            todayPomodoros: todaySessions.filter(s => s.type === 'work').length,
            weekPomodoros: weekSessions.filter(s => s.type === 'work').length,
            monthPomodoros: monthSessions.filter(s => s.type === 'work').length,
            totalMinutes: Math.round(totalWorkTime),
            avgSessionLength: Math.round(avgSessionLength),
            completionRate: Math.round(completionRate),
            streak: this.calculateStreak(sessions)
        };
    }

    calculateStreak(sessions) {
        const workSessions = sessions.filter(s => s.type === 'work' && !s.skipped);
        if (workSessions.length === 0) return 0;

        const today = new Date();
        let currentStreak = 0;
        let checkDate = new Date(today);

        // Check consecutive days with at least one work session
        while (checkDate) {
            const dayStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            
            const hasSessions = workSessions.some(s => {
                const sessionDate = new Date(s.start);
                return sessionDate >= dayStart && sessionDate < dayEnd;
            });

            if (hasSessions) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }

            // Prevent infinite loop
            if (currentStreak > 365) break;
        }

        return currentStreak;
    }

    calculateHourlyProductivity(sessions) {
        const hourlyData = new Array(24).fill(0);
        const workSessions = sessions.filter(s => s.type === 'work' && !s.skipped);

        workSessions.forEach(session => {
            const hour = new Date(session.start).getHours();
            const duration = (session.end - session.start) / (1000 * 60); // minutes
            hourlyData[hour] += duration;
        });

        // Normalize to 0-4 scale for heatmap
        const maxValue = Math.max(...hourlyData);
        return hourlyData.map(value => {
            if (value === 0) return 0;
            const normalized = value / maxValue;
            if (normalized > 0.75) return 4;
            if (normalized > 0.5) return 3;
            if (normalized > 0.25) return 2;
            return 1;
        });
    }

    findMostProductiveHours(sessions) {
        const hourlyMinutes = new Array(24).fill(0);
        const workSessions = sessions.filter(s => s.type === 'work' && !s.skipped);

        workSessions.forEach(session => {
            const hour = new Date(session.start).getHours();
            const duration = (session.end - session.start) / (1000 * 60);
            hourlyMinutes[hour] += duration;
        });

        // Find top 3 hours
        const hoursWithData = hourlyMinutes
            .map((minutes, hour) => ({ hour, minutes }))
            .filter(item => item.minutes > 0)
            .sort((a, b) => b.minutes - a.minutes)
            .slice(0, 3);

        return hoursWithData;
    }

    calculateFocusScore(sessions) {
        const recentSessions = sessions.filter(s => {
            const sessionDate = new Date(s.start);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return sessionDate >= weekAgo;
        });

        if (recentSessions.length === 0) return 0;

        const completedSessions = recentSessions.filter(s => !s.skipped);
        const workSessions = recentSessions.filter(s => s.type === 'work');
        const completedWorkSessions = workSessions.filter(s => !s.skipped);

        // Base score on completion rate
        const completionRate = recentSessions.length > 0 ? completedSessions.length / recentSessions.length : 0;
        
        // Bonus for consistent work sessions
        const workConsistency = workSessions.length > 0 ? completedWorkSessions.length / workSessions.length : 0;
        
        // Calculate final score (0-100)
        const focusScore = (completionRate * 0.7 + workConsistency * 0.3) * 100;
        
        return Math.round(focusScore);
    }

    generateInsights(sessions, stats) {
        const insights = [];

        // Productivity insights
        const productiveHours = this.findMostProductiveHours(sessions);
        if (productiveHours.length > 0) {
            const topHour = productiveHours[0];
            const timeStr = `${topHour.hour}:00`;
            insights.push(`🔥 Most productive at ${timeStr} (${Math.round(topHour.minutes)} min)`);
        }

        // Streak insights
        if (stats.streak > 0) {
            if (stats.streak === 1) {
                insights.push(`🎯 Started a new streak today!`);
            } else {
                insights.push(`🔥 ${stats.streak} day streak - keep it up!`);
            }
        } else {
            insights.push(`💪 Start a new streak today!`);
        }

        // Completion rate insights
        if (stats.completionRate >= 90) {
            insights.push(`⭐ Excellent completion rate (${stats.completionRate}%)`);
        } else if (stats.completionRate >= 70) {
            insights.push(`👍 Good completion rate (${stats.completionRate}%)`);
        } else if (stats.completionRate < 50) {
            insights.push(`💡 Try shorter sessions to improve completion rate`);
        }

        // Weekly progress
        if (stats.weekPomodoros >= 20) {
            insights.push(`🚀 Great week! ${stats.weekPomodoros} Pomodoros completed`);
        } else if (stats.weekPomodoros >= 10) {
            insights.push(`📈 Solid progress: ${stats.weekPomodoros} Pomodoros this week`);
        }

        return insights;
    }

    renderEnhancedStats() {
        const sessions = this.getSessionData();
        const stats = this.calculateBasicStats(sessions);
        const hourlyProductivity = this.calculateHourlyProductivity(sessions);
        const focusScore = this.calculateFocusScore(sessions);
        const insights = this.generateInsights(sessions, stats);
        const weeklyData = this.getWeeklyData(sessions);
        const sessionTypeBreakdown = this.getSessionTypeBreakdown(sessions);

        const html = `
            <div class="enhanced-overview">
                <div class="overview-section">
                    <h3>📈 Performance Overview</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h4>Today</h4>
                            <div class="stat-value">${stats.todayPomodoros}</div>
                            <div class="stat-subtitle">Pomodoros Completed</div>
                        </div>
                        <div class="stat-card">
                            <h4>This Week</h4>
                            <div class="stat-value">${stats.weekPomodoros}</div>
                            <div class="stat-subtitle">Work Sessions</div>
                        </div>
                        <div class="stat-card">
                            <h4>This Month</h4>
                            <div class="stat-value">${stats.monthPomodoros}</div>
                            <div class="stat-subtitle">Total Sessions</div>
                        </div>
                        <div class="stat-card">
                            <h4>Current Streak</h4>
                            <div class="stat-value" style="color: ${stats.streak > 0 ? '#28a745' : '#dc3545'}">${stats.streak}</div>
                            <div class="stat-subtitle">Consecutive Days</div>
                        </div>
                        <div class="stat-card">
                            <h4>Total Focus Time</h4>
                            <div class="stat-value">${Math.round(stats.totalMinutes / 60 * 10) / 10}</div>
                            <div class="stat-subtitle">Hours This Month</div>
                        </div>
                        <div class="stat-card">
                            <h4>Average Session</h4>
                            <div class="stat-value">${stats.avgSessionLength}</div>
                            <div class="stat-subtitle">Minutes</div>
                        </div>
                        <div class="stat-card">
                            <h4>Completion Rate</h4>
                            <div class="stat-value" style="color: ${this.getCompletionColor(stats.completionRate)}">${stats.completionRate}%</div>
                            <div class="stat-subtitle">Success Rate</div>
                        </div>
                        <div class="stat-card">
                            <h4>Focus Score</h4>
                            <div class="stat-value" style="color: ${this.getFocusScoreColor(focusScore)}">${focusScore}</div>
                            <div class="stat-subtitle">Weekly Average</div>
                        </div>
                    </div>
                </div>

                <div class="charts-section">
                    <div class="chart-row">
                        <div class="productivity-chart half-chart">
                            <div class="chart-title">🔥 Daily Productivity Heatmap</div>
                            <div class="heatmap-container">
                                ${hourlyProductivity.map((intensity, hour) => {
                                    const actualMinutes = this.getHourlyMinutes(sessions, hour);
                                    return `<div class="heatmap-cell intensity-${intensity}" 
                                              title="${hour}:00 - ${Math.round(actualMinutes)} minutes of work">
                                         </div>`;
                                }).join('')}
                            </div>
                            <div class="heatmap-labels">
                                <span>0:00</span>
                                <span>6:00</span>
                                <span>12:00</span>
                                <span>18:00</span>
                                <span>23:00</span>
                            </div>
                        </div>

                        <div class="productivity-chart half-chart">
                            <div class="chart-title">📊 Session Type Breakdown</div>
                            <div class="session-breakdown">
                                <div class="breakdown-item">
                                    <div class="breakdown-bar work-bar" style="width: ${sessionTypeBreakdown.workPercent}%"></div>
                                    <span>Work: ${sessionTypeBreakdown.work} sessions (${sessionTypeBreakdown.workPercent}%)</span>
                                </div>
                                <div class="breakdown-item">
                                    <div class="breakdown-bar short-bar" style="width: ${sessionTypeBreakdown.shortPercent}%"></div>
                                    <span>Short Break: ${sessionTypeBreakdown.short} sessions (${sessionTypeBreakdown.shortPercent}%)</span>
                                </div>
                                <div class="breakdown-item">
                                    <div class="breakdown-bar long-bar" style="width: ${sessionTypeBreakdown.longPercent}%"></div>
                                    <span>Long Break: ${sessionTypeBreakdown.long} sessions (${sessionTypeBreakdown.longPercent}%)</span>
                                </div>
                                <div class="breakdown-item">
                                    <div class="breakdown-bar skipped-bar" style="width: ${sessionTypeBreakdown.skippedPercent}%"></div>
                                    <span>Skipped: ${sessionTypeBreakdown.skipped} sessions (${sessionTypeBreakdown.skippedPercent}%)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="productivity-chart">
                        <div class="chart-title">📅 Weekly Progress Trend</div>
                        <div class="weekly-chart">
                            ${weeklyData.map((day, index) => `
                                <div class="weekly-bar-container">
                                    <div class="weekly-bar" style="height: ${day.percentage}%; background: ${day.sessions > 0 ? '#28a745' : '#e9ecef'}"></div>
                                    <div class="weekly-label">${day.name}</div>
                                    <div class="weekly-count">${day.sessions}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                ${insights.length > 0 ? `
                <div class="insights-section">
                    <div class="productivity-chart">
                        <div class="chart-title">💡 Personalized Insights & Recommendations</div>
                        <div class="insights-grid">
                            ${insights.map(insight => `
                                <div class="insight-card">
                                    <div class="insight-text">${insight}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                ` : ''}

                <div class="summary-section">
                    <div class="focus-trends">
                        <div class="trend-item">
                            <div class="trend-value" style="color: ${this.getWeekComparison(sessions).startsWith('+') ? '#28a745' : '#dc3545'}">${this.getWeekComparison(sessions)}%</div>
                            <div class="trend-label">Week over Week</div>
                        </div>
                        <div class="trend-item">
                            <div class="trend-value">${this.getBestDay(sessions)}</div>
                            <div class="trend-label">Most Productive Day</div>
                        </div>
                        <div class="trend-item">
                            <div class="trend-value">${this.getMostProductiveHour(sessions)}</div>
                            <div class="trend-label">Peak Hour</div>
                        </div>
                        <div class="trend-item">
                            <div class="trend-value">${sessions.length}</div>
                            <div class="trend-label">Total Sessions Ever</div>
                        </div>
                    </div>
                </div>

                <div class="raw-data-section">
                    <div class="productivity-chart">
                        <div class="chart-title">🔍 Raw Data Summary</div>
                        <div class="raw-data-grid">
                            <div class="raw-data-item">
                                <strong>Total Sessions Recorded:</strong> ${sessions.length}
                            </div>
                            <div class="raw-data-item">
                                <strong>First Session:</strong> ${sessions.length > 0 ? new Date(Math.min(...sessions.map(s => s.start))).toLocaleDateString() : 'No data'}
                            </div>
                            <div class="raw-data-item">
                                <strong>Last Session:</strong> ${sessions.length > 0 ? new Date(Math.max(...sessions.map(s => s.end))).toLocaleDateString() : 'No data'}
                            </div>
                            <div class="raw-data-item">
                                <strong>Average Daily Sessions:</strong> ${this.getAverageDailySessions(sessions)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.enhancedStatsContent.innerHTML = html;
    }

    getFocusScoreColor(score) {
        if (score >= 80) return '#28a745';
        if (score >= 60) return '#ffc107';
        if (score >= 40) return '#fd7e14';
        return '#dc3545';
    }

    getWeekComparison(sessions) {
        const now = new Date();
        const thisWeekStart = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const lastWeekStart = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

        const thisWeekSessions = sessions.filter(s => {
            const date = new Date(s.start);
            return date >= thisWeekStart && s.type === 'work' && !s.skipped;
        });

        const lastWeekSessions = sessions.filter(s => {
            const date = new Date(s.start);
            return date >= lastWeekStart && date < thisWeekStart && s.type === 'work' && !s.skipped;
        });

        if (lastWeekSessions.length === 0) return thisWeekSessions.length > 0 ? '+100' : '0';
        
        const change = ((thisWeekSessions.length - lastWeekSessions.length) / lastWeekSessions.length) * 100;
        return change > 0 ? `+${Math.round(change)}` : Math.round(change).toString();
    }

    getBestDay(sessions) {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dailyCounts = new Array(7).fill(0);

        sessions.filter(s => s.type === 'work' && !s.skipped).forEach(session => {
            const day = new Date(session.start).getDay();
            dailyCounts[day]++;
        });

        const bestDayIndex = dailyCounts.indexOf(Math.max(...dailyCounts));
        return dailyCounts[bestDayIndex] > 0 ? daysOfWeek[bestDayIndex] : 'None';
    }

    getHourlyMinutes(sessions, hour) {
        const workSessions = sessions.filter(s => s.type === 'work' && !s.skipped);
        let totalMinutes = 0;

        workSessions.forEach(session => {
            const sessionHour = new Date(session.start).getHours();
            if (sessionHour === hour) {
                totalMinutes += (session.end - session.start) / (1000 * 60);
            }
        });

        return totalMinutes;
    }

    getSessionTypeBreakdown(sessions) {
        const total = sessions.length;
        if (total === 0) return { work: 0, short: 0, long: 0, skipped: 0, workPercent: 0, shortPercent: 0, longPercent: 0, skippedPercent: 0 };

        const work = sessions.filter(s => s.type === 'work' && !s.skipped).length;
        const short = sessions.filter(s => s.type === 'short' && !s.skipped).length;
        const long = sessions.filter(s => s.type === 'long' && !s.skipped).length;
        const skipped = sessions.filter(s => s.skipped).length;

        return {
            work,
            short,
            long,
            skipped,
            workPercent: Math.round((work / total) * 100),
            shortPercent: Math.round((short / total) * 100),
            longPercent: Math.round((long / total) * 100),
            skippedPercent: Math.round((skipped / total) * 100)
        };
    }

    getWeeklyData(sessions) {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dailyCounts = new Array(7).fill(0);

        sessions.filter(s => s.type === 'work' && !s.skipped).forEach(session => {
            const day = new Date(session.start).getDay();
            dailyCounts[day]++;
        });

        const maxCount = Math.max(...dailyCounts, 1);

        return dailyCounts.map((count, index) => ({
            name: daysOfWeek[index],
            sessions: count,
            percentage: Math.max((count / maxCount) * 100, 5) // Minimum 5% for visibility
        }));
    }

    getCompletionColor(rate) {
        if (rate >= 80) return '#28a745';
        if (rate >= 60) return '#ffc107';
        if (rate >= 40) return '#fd7e14';
        return '#dc3545';
    }

    getMostProductiveHour(sessions) {
        const hourlyMinutes = new Array(24).fill(0);
        const workSessions = sessions.filter(s => s.type === 'work' && !s.skipped);

        workSessions.forEach(session => {
            const hour = new Date(session.start).getHours();
            const duration = (session.end - session.start) / (1000 * 60);
            hourlyMinutes[hour] += duration;
        });

        const maxHour = hourlyMinutes.indexOf(Math.max(...hourlyMinutes));
        return hourlyMinutes[maxHour] > 0 ? `${maxHour}:00` : 'None';
    }

    getAverageDailySessions(sessions) {
        if (sessions.length === 0) return 0;

        const dates = [...new Set(sessions.map(s => new Date(s.start).toDateString()))];
        return Math.round((sessions.length / dates.length) * 10) / 10;
    }

    // Test function for generating realistic test data
    generateTestData() {
        const sessions = [];
        const now = new Date();
        const daysBack = 30; // Generate 30 days of data

        for (let day = 0; day < daysBack; day++) {
            const date = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
            
            // Skip some days randomly (weekends more likely to be skipped)
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const skipChance = isWeekend ? 0.6 : 0.2;
            if (Math.random() < skipChance) continue;

            // Generate 2-8 work sessions per day
            const sessionsPerDay = Math.floor(Math.random() * 7) + 2;
            let currentTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9); // Start at 9 AM

            for (let session = 0; session < sessionsPerDay; session++) {
                // Work session
                const workDuration = (20 + Math.random() * 15) * 60 * 1000; // 20-35 minutes
                const workStart = currentTime.getTime();
                const workEnd = workStart + workDuration;
                const shouldSkipWork = Math.random() < 0.15; // 15% chance to skip work

                if (shouldSkipWork) {
                    // Add partial work session
                    const partialEnd = workStart + (workDuration * 0.6);
                    sessions.push({
                        type: 'work',
                        start: workStart,
                        end: partialEnd,
                        completed: true
                    });
                    // Add skipped part
                    sessions.push({
                        type: 'work',
                        start: partialEnd,
                        end: workEnd,
                        completed: false,
                        skipped: true
                    });
                } else {
                    sessions.push({
                        type: 'work',
                        start: workStart,
                        end: workEnd,
                        completed: true
                    });
                }

                currentTime = new Date(workEnd);

                // Break session (if not last session)
                if (session < sessionsPerDay - 1) {
                    const isLongBreak = (session + 1) % 4 === 0;
                    const breakType = isLongBreak ? 'long' : 'short';
                    const breakDuration = (isLongBreak ? 15 : 5) * 60 * 1000;
                    const breakStart = currentTime.getTime();
                    const breakEnd = breakStart + breakDuration;
                    const shouldSkipBreak = Math.random() < 0.1; // 10% chance to skip break

                    if (shouldSkipBreak) {
                        sessions.push({
                            type: breakType,
                            start: breakStart,
                            end: breakStart + (breakDuration * 0.3),
                            completed: true
                        });
                        sessions.push({
                            type: breakType,
                            start: breakStart + (breakDuration * 0.3),
                            end: breakEnd,
                            completed: false,
                            skipped: true
                        });
                    } else {
                        sessions.push({
                            type: breakType,
                            start: breakStart,
                            end: breakEnd,
                            completed: true
                        });
                    }

                    currentTime = new Date(breakEnd + (Math.random() * 10 * 60 * 1000)); // Random gap between sessions
                }
            }
        }

        // Save to localStorage
        const existingData = JSON.parse(localStorage.getItem('pomodoroData') || '{}');
        existingData.sessions = sessions.sort((a, b) => a.start - b.start);
        localStorage.setItem('pomodoroData', JSON.stringify(existingData));

        console.log(`✅ Generated ${sessions.length} test sessions over ${daysBack} days`);
        console.log(`📊 Work sessions: ${sessions.filter(s => s.type === 'work' && !s.skipped).length}`);
        console.log(`☕ Break sessions: ${sessions.filter(s => s.type !== 'work' && !s.skipped).length}`);
        console.log(`⏭️ Skipped sessions: ${sessions.filter(s => s.skipped).length}`);
        
        return sessions;
    }
}

// Initialize Enhanced Stats when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedStats = new EnhancedStats();
});

// Global test function for console usage
window.generateEnhancedStatsTestData = function() {
    if (window.enhancedStats) {
        return window.enhancedStats.generateTestData();
    } else {
        console.error('Enhanced stats not initialized yet');
    }
};

// Helper function to clear test data
window.clearEnhancedStatsData = function() {
    const data = JSON.parse(localStorage.getItem('pomodoroData') || '{}');
    data.sessions = [];
    localStorage.setItem('pomodoroData', JSON.stringify(data));
    console.log('✅ Enhanced stats data cleared');
};

// Export for external use
window.EnhancedStats = EnhancedStats;
