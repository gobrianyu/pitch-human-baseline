/**
 * Interaction Tracker
 * Tracks mouse, keyboard, and interaction patterns to detect bot behavior
 */

export class InteractionTracker {
    constructor() {
        this.mouseMovements = [];
        this.mouseClicks = [];
        this.keyPresses = [];
        this.copyPasteEvents = [];
        this.keyboardNavCount = 0;
        this.clickNavCount = 0;

        this.initializeListeners();
    }

    initializeListeners() {
        // Track mouse movement (throttled)
        let lastMouseTime = 0;
        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (now - lastMouseTime > 100) { // Throttle to every 100ms
                this.trackMouseMove(e);
                lastMouseTime = now;
            }
        });

        // Track mouse clicks
        document.addEventListener('click', (e) => {
            this.trackMouseClick(e);
        });

        // Track keyboard
        document.addEventListener('keydown', (e) => {
            this.trackKeyPress(e);
        });

        // Track copy/paste
        document.addEventListener('copy', () => this.trackCopyPaste('copy'));
        document.addEventListener('paste', () => this.trackCopyPaste('paste'));
    }

    trackMouseMove(event) {
        this.mouseMovements.push({
            x: event.clientX,
            y: event.clientY,
            timestamp: Date.now()
        });

        // Keep only last 50 movements to save memory
        if (this.mouseMovements.length > 50) {
            this.mouseMovements.shift();
        }
    }

    trackMouseClick(event) {
        this.mouseClicks.push({
            x: event.clientX,
            y: event.clientY,
            target: event.target.id || event.target.className,
            timestamp: Date.now()
        });
    }

    trackKeyPress(event) {
        this.keyPresses.push({
            key: event.key,
            timestamp: Date.now()
        });

        // Track navigation method
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            this.keyboardNavCount++;
        }
    }

    trackCopyPaste(type) {
        this.copyPasteEvents.push({
            type,
            timestamp: Date.now()
        });
    }

    incrementClickNav() {
        this.clickNavCount++;
    }

    hasMouseMovement() {
        return this.mouseMovements.length > 0;
    }

    getKeyboardNavigationRatio() {
        const total = this.keyboardNavCount + this.clickNavCount;
        if (total === 0) return 0;
        return this.keyboardNavCount / total;
    }

    getInteractionData() {
        return {
            hasMouseMovement: this.hasMouseMovement(),
            totalMouseMoves: this.mouseMovements.length,
            totalClicks: this.mouseClicks.length,
            totalKeyPresses: this.keyPresses.length,
            keyboardNavigationCount: this.keyboardNavCount,
            clickNavigationCount: this.clickNavCount,
            copyPasteEvents: this.copyPasteEvents.length,
            keyboardNavigationRatio: this.getKeyboardNavigationRatio()
        };
    }
}

// Create singleton instance
export const interactionTracker = new InteractionTracker();
