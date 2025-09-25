// Enhanced Statistics Module
// Provides advanced analytics and insights for Pomodoro sessions

class EnhancedStats {
    constructor() {
        this.isVisible = false;
        this.enhancedStatsBtn = document.getElementById('enhancedStatsBtn');
        this.enhancedStatsPanel = document.getElementById('enhancedStatsPanel');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        if (this.enhancedStatsBtn) {
            this.enhancedStatsBtn.addEventListener('click', () => {
                this.toggleEnhancedStats();
            });
        }
    }

    toggleEnhancedStats() {
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            this.showEnhancedStats();
            this.enhancedStatsBtn.textContent = '📉 Hide Enhanced Statistics';
            this.enhancedStatsBtn.classList.add('active');
        } else {
            this.hideEnhancedStats();
            this.enhancedStatsBtn.textContent = '📈 Enhanced Statistics';
            this.enhancedStatsBtn.classList.remove('active');
        }
    }

    showEnhancedStats() {
        this.renderEnhancedStats();
        this.enhancedStatsPanel.style.display = 'block';
    }

    hideEnhancedStats() {
        this.enhancedStatsPanel.style.display = 'none';
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

        const html = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h4>Today</h4>
                    <div class="stat-value">${stats.todayPomodoros}</div>
                    <div class="stat-subtitle">Pomodoros</div>
                </div>
                <div class="stat-card">
                    <h4>This Week</h4>
                    <div class="stat-value">${stats.weekPomodoros}</div>
                    <div class="stat-subtitle">Pomodoros</div>
                </div>
                <div class="stat-card">
                    <h4>This Month</h4>
                    <div class="stat-value">${stats.monthPomodoros}</div>
                    <div class="stat-subtitle">Pomodoros</div>
                </div>
                <div class="stat-card">
                    <h4>Streak</h4>
                    <div class="stat-value">${stats.streak}</div>
                    <div class="stat-subtitle">Days</div>
                </div>
                <div class="stat-card">
                    <h4>Total Time</h4>
                    <div class="stat-value">${Math.round(stats.totalMinutes / 60 * 10) / 10}</div>
                    <div class="stat-subtitle">Hours</div>
                </div>
                <div class="stat-card">
                    <h4>Avg Session</h4>
                    <div class="stat-value">${stats.avgSessionLength}</div>
                    <div class="stat-subtitle">Minutes</div>
                </div>
                <div class="stat-card">
                    <h4>Completion</h4>
                    <div class="stat-value">${stats.completionRate}%</div>
                    <div class="stat-subtitle">Success Rate</div>
                </div>
                <div class="stat-card">
                    <h4>Focus Score</h4>
                    <div class="stat-value" style="color: ${this.getFocusScoreColor(focusScore)}">${focusScore}</div>
                    <div class="stat-subtitle">Last 7 Days</div>
                </div>
            </div>

            <div class="productivity-chart">
                <div class="chart-title">📊 Productivity Heatmap (24 Hours)</div>
                <div class="heatmap-container">
                    ${hourlyProductivity.map((intensity, hour) => 
                        `<div class="heatmap-cell intensity-${intensity}" 
                              title="${hour}:00 - ${Math.round(hourlyProductivity[hour] * 100 / Math.max(...hourlyProductivity.map((v, i) => hourlyProductivity[i] || 1)) || 0)}% productive">
                         </div>`
                    ).join('')}
                </div>
                <div class="heatmap-labels">
                    <span>0:00</span>
                    <span>6:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>23:00</span>
                </div>
            </div>

            ${insights.length > 0 ? `
            <div class="productivity-chart">
                <div class="chart-title">💡 Insights & Tips</div>
                <div style="margin-top: 12px;">
                    ${insights.map(insight => `
                        <div style="padding: 8px 12px; margin: 6px 0; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #6f42c1; font-size: 0.9em;">
                            ${insight}
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="focus-trends">
                <div class="trend-item">
                    <div class="trend-value">${this.getWeekComparison(sessions)}%</div>
                    <div class="trend-label">vs Last Week</div>
                </div>
                <div class="trend-item">
                    <div class="trend-value">${stats.weekPomodoros > 0 ? Math.round(stats.totalMinutes / stats.weekPomodoros) : 0}</div>
                    <div class="trend-label">Min/Pomodoro</div>
                </div>
                <div class="trend-item">
                    <div class="trend-value">${this.getBestDay(sessions)}</div>
                    <div class="trend-label">Best Day</div>
                </div>
            </div>
        `;

        this.enhancedStatsPanel.innerHTML = html;
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
}

// Initialize Enhanced Stats when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedStats = new EnhancedStats();
});

// Export for external use
window.EnhancedStats = EnhancedStats;
