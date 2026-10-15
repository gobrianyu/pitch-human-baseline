/**
 * Bot Detection System
 * Tracks honeypots, timing, and interaction patterns to identify automated bots
 */

export class BotDetector {
    constructor() {
        this.violations = [];
        this.score = 0;
        this.startTime = Date.now();

        // Honeypot field IDs to monitor
        this.honeypotFields = [
            'honeypot-email',
            'honeypot-username',
            'honeypot-phone',
            'honeypot-check',
            'honeypot-verify',
            'honeypot-comments'
        ];

        // Honeypot button IDs to monitor
        this.honeypotButtons = [
            'honeypot-skip-instructions',
            'honeypot-complete',
            'btn-select-honeypot'
        ];

        this.initializeMonitoring();
    }

    initializeMonitoring() {
        // Monitor all honeypot fields for changes
        this.honeypotFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => this.honeypotFieldTriggered(fieldId));
                field.addEventListener('change', () => this.honeypotFieldTriggered(fieldId));
            }
        });

        // Monitor all honeypot buttons for clicks
        this.honeypotButtons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.honeypotButtonTriggered(buttonId);
                });
            }
        });
    }

    honeypotFieldTriggered(fieldId) {
        const field = document.getElementById(fieldId);
        const value = field ? (field.type === 'checkbox' ? field.checked : field.value) : null;

        this.flagViolation('honeypot_field', 'critical', {
            field: fieldId,
            value: value,
            timestamp: Date.now()
        });
    }

    honeypotButtonTriggered(buttonId) {
        this.flagViolation('honeypot_button', 'critical', {
            button: buttonId,
            timestamp: Date.now()
        });
    }

    flagViolation(type, severity, data) {
        const points = {
            'critical': 100,
            'major': 50,
            'minor': 10
        }[severity] || 0;

        this.score += points;

        this.violations.push({
            type,
            severity,
            data,
            points,
            timestamp: Date.now()
        });

        console.warn(`[BotDetector] ${severity.toUpperCase()} violation: ${type}`, data);
    }

    checkAllHoneypots() {
        // Check if any honeypot fields have values
        this.honeypotFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field) return;

            const value = field.type === 'checkbox' ? field.checked : field.value;
            if (value && value !== '' && value !== false) {
                this.honeypotFieldTriggered(fieldId);
            }
        });
    }

    checkTimingViolations(timingData) {
        // NOTE: We don't check rapid_consent because the checkbox and Continue button
        // are right next to each other, so quick clicking is normal user behavior

        // Too fast instruction reading - page 1
        if (timingData.instructionPage1 && timingData.instructionPage1 < 5000) {
            this.flagViolation('rapid_instructions_1', 'major', {
                duration: timingData.instructionPage1,
                threshold: 5000
            });
        }

        // Too fast instruction reading - page 2
        if (timingData.instructionPage2 && timingData.instructionPage2 < 5000) {
            this.flagViolation('rapid_instructions_2', 'major', {
                duration: timingData.instructionPage2,
                threshold: 5000
            });
        }

        // Superhuman task completion (only flag if averaging < 1 second per turn)
        // Note: 2-3 seconds per turn is reasonable for fast readers
        if (timingData.averageTimePerTurn && timingData.averageTimePerTurn < 1000) {
            this.flagViolation('superhuman_speed', 'major', {
                average: timingData.averageTimePerTurn,
                threshold: 1000
            });
        }

        // Robotic rhythm detection
        if (timingData.turnTimings && timingData.turnTimings.length >= 5) {
            const rhythm = this.analyzeRhythm(timingData.turnTimings);
            if (rhythm.isRobotic) {
                this.flagViolation('robotic_rhythm', 'minor', rhythm);
            }
        }
    }

    analyzeRhythm(timings) {
        // Calculate variance in turn timings
        const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
        const variance = timings.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / timings.length;
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / mean;

        // Humans have variation, bots are suspiciously consistent
        // CV < 0.1 means very little variation (robotic)
        return {
            isRobotic: coefficientOfVariation < 0.1 && timings.length >= 5,
            coefficientOfVariation,
            mean,
            stdDev
        };
    }

    checkInteractionViolations(interactionData) {
        // No mouse movement detected
        if (!interactionData.hasMouseMovement || interactionData.totalMouseMoves < 5) {
            this.flagViolation('no_mouse_movement', 'minor', {
                totalMoves: interactionData.totalMouseMoves || 0
            });
        }

        // Excessive keyboard-only navigation
        const total = (interactionData.keyboardNavigationCount || 0) + (interactionData.clickNavigationCount || 0);
        if (total > 0) {
            const keyboardRatio = interactionData.keyboardNavigationCount / total;

            if (keyboardRatio === 1.0 && interactionData.keyboardNavigationCount > 10) {
                this.flagViolation('keyboard_only', 'minor', {
                    keyboardNav: interactionData.keyboardNavigationCount,
                    clickNav: interactionData.clickNavigationCount
                });
            }
        }

        // Excessive copy-paste (bots extracting content)
        if (interactionData.copyPasteEvents && interactionData.copyPasteEvents > 5) {
            this.flagViolation('excessive_copy_paste', 'minor', {
                count: interactionData.copyPasteEvents
            });
        }
    }

    isFlagged() {
        return this.score >= 51;
    }

    isSuspicious() {
        return this.score >= 21 && this.score < 51;
    }

    getScore() {
        return this.score;
    }

    getViolations() {
        return this.violations;
    }

    getDetailedData() {
        return {
            score: this.score,
            isFlagged: this.isFlagged(),
            isSuspicious: this.isSuspicious(),
            violations: this.violations,
            violationCounts: this.getViolationCounts(),
            timestamp: Date.now()
        };
    }

    getViolationCounts() {
        const counts = {
            critical: 0,
            major: 0,
            minor: 0
        };

        this.violations.forEach(v => {
            counts[v.severity]++;
        });

        return counts;
    }
}

// Create singleton instance
export const botDetector = new BotDetector();
