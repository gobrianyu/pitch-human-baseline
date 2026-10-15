/**
 * Timing Tracker
 * Tracks timing of user interactions throughout the session
 */

export class TimingTracker {
    constructor() {
        this.timers = new Map();
        this.completed = new Map();
        this.turnTimings = [];
        this.sessionStart = Date.now();
    }

    startTimer(eventName) {
        const now = Date.now();
        this.timers.set(eventName, now);
        console.log(`[TimingTracker] Started timer: ${eventName} at ${now}`);
    }

    endTimer(eventName) {
        if (!this.timers.has(eventName)) {
            console.warn(`[TimingTracker] Timer ${eventName} was never started`);
            return 0;
        }

        const startTime = this.timers.get(eventName);
        const elapsed = Date.now() - startTime;
        this.completed.set(eventName, elapsed);
        this.timers.delete(eventName);

        console.log(`[TimingTracker] Ended timer: ${eventName}, duration: ${elapsed}ms`);

        return elapsed;
    }

    getElapsed(eventName) {
        return this.completed.get(eventName) || 0;
    }

    recordTurnTiming(duration) {
        this.turnTimings.push(duration);
    }

    getAverageTimePerTurn() {
        if (this.turnTimings.length === 0) return 0;
        return this.turnTimings.reduce((a, b) => a + b, 0) / this.turnTimings.length;
    }

    getTotalSessionTime() {
        return Date.now() - this.sessionStart;
    }

    getAllTimings() {
        return {
            pageLoadToConsent: this.getElapsed('page_to_consent'),
            consentToSubmit: this.getElapsed('consent_to_submit'),
            instructionPage1: this.getElapsed('instruction_page_1'),
            instructionPage2: this.getElapsed('instruction_page_2'),
            totalTaskDuration: this.getElapsed('task_duration'),
            averageTimePerTurn: this.getAverageTimePerTurn(),
            turnTimings: [...this.turnTimings],
            totalSessionTime: this.getTotalSessionTime()
        };
    }
}

// Create singleton instance
export const timingTracker = new TimingTracker();
