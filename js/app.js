/**
 * Main application module
 * Orchestrates the application flow and event handlers for 3-message batch system
 */

import * as Data from './data.js?v=20260925A';
import * as UI from './ui.js?v=20260925A';
import { botDetector } from './botDetection.js?v=20260925A';
import { timingTracker } from './timingTracker.js?v=20260925A';
import { interactionTracker } from './interactionTracker.js?v=20260925A';

// Expose to window for debugging
window.botDetector = botDetector;
window.timingTracker = timingTracker;
window.interactionTracker = interactionTracker;

let selectedMessageIndex = null; // Track which message is selected for sending

function init() {
    console.log('App initializing...');

    // START BOT DETECTION - Begin tracking page load time
    try {
        console.log('[Bot Detection] Checking modules...');
        console.log('  botDetector:', typeof botDetector);
        console.log('  timingTracker:', typeof timingTracker);
        console.log('  interactionTracker:', typeof interactionTracker);

        timingTracker.startTimer('page_to_consent');
        console.log('[Bot Detection] ✅ Started tracking successfully');
    } catch (error) {
        console.error('[Bot Detection] ❌ Failed to initialize:', error);
    }
    // END BOT DETECTION

    // Clear any old storage data from previous versions
    sessionStorage.clear();
    localStorage.clear();
    console.log('Storage cleared');

    UI.configureMarkdown();
    console.log('Showing Prolific screen');
    UI.showProlificScreen();
    setupEventListeners();
    console.log('App initialization complete');
}

function loadStudyData() {
    UI.showLoading();

    Data.loadData()
        .then(() => {
            UI.hideLoading();
            UI.setupScenarioToggle();
            startNewItem();
        })
        .catch(error => {
            document.getElementById('loading').textContent = 'Error loading data: ' + error.message;
        });
}

function setupEventListeners() {
    // Consent checkbox - enable Continue button only when checked
    const consentCheckbox = document.getElementById('consent-agree');
    if (consentCheckbox) {
        consentCheckbox.addEventListener('change', (e) => {
            // START BOT DETECTION - Track time to consent
            if (e.target.checked) {
                timingTracker.endTimer('page_to_consent');
                timingTracker.startTimer('consent_to_submit');
            }
            // END BOT DETECTION

            const submitButton = document.getElementById('btn-prolific-submit');
            submitButton.disabled = !e.target.checked;
        });
    }

    document.getElementById('btn-prolific-submit').addEventListener('click', handleProlificSubmit);
    document.getElementById('prolific-id').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleProlificSubmit();
        }
    });
    document.getElementById('btn-next-instruction').addEventListener('click', handleNextInstruction);
    document.getElementById('btn-back-instruction').addEventListener('click', handleBackInstruction);
    document.getElementById('btn-start').addEventListener('click', handleStartTask);
    document.getElementById('btn-next').addEventListener('click', handleNextTurn);
    document.getElementById('btn-complete').addEventListener('click', handleComplete);
    document.getElementById('btn-send').addEventListener('click', handleSendClick);
    document.getElementById('btn-confirm-yes').addEventListener('click', handleConfirmYes);
    document.getElementById('btn-confirm-no').addEventListener('click', handleConfirmNo);
    document.getElementById('btn-mark-all-not-relevant').addEventListener('click', handleMarkAllNotRelevant);

    // Setup click listeners for all 3 message cards
    for (let i = 1; i <= 3; i++) {
        setupMessageCardListener(i);
        setupMessageButtonListener(i);
    }

    document.addEventListener('keydown', handleKeyboardShortcuts);
}

function setupMessageCardListener(messageIndex) {
    const card = document.getElementById(`message-card-${messageIndex}`);
    if (card) {
        card.addEventListener('click', (e) => {
            // Don't trigger card click if button was clicked
            if (e.target.classList.contains('btn-select-message')) {
                return;
            }
            handleCardClick(messageIndex);
        });
    }
}

function setupMessageButtonListener(messageIndex) {
    const button = document.getElementById(`btn-select-${messageIndex}`);
    if (button) {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent card click from firing
            handleCardClick(messageIndex);
        });
    }
}

function handleNextInstruction() {
    // START BOT DETECTION - End instruction page 1, start page 2
    timingTracker.endTimer('instruction_page_1');
    timingTracker.startTimer('instruction_page_2');
    botDetector.checkAllHoneypots();
    // END BOT DETECTION

    UI.showInstructionScreen2();
}

function handleBackInstruction() {
    UI.showInstructionScreen1();
}

function handleStartTask() {
    // START BOT DETECTION - End instruction page 2, start task
    timingTracker.endTimer('instruction_page_2');
    timingTracker.startTimer('task_duration');
    botDetector.checkAllHoneypots();
    console.log('[Bot Detection] Task started, timers initialized');
    // END BOT DETECTION

    UI.hideInstructionScreen();
    // Automatically show the first turn
    handleNextTurn();
}

function handleProlificSubmit() {
    const input = document.getElementById('prolific-id');
    const prolificId = input.value.trim();

    if (prolificId.length < 5) {
        UI.showProlificError();
        return;
    }

    // START BOT DETECTION - End consent timing and check honeypots
    timingTracker.endTimer('consent_to_submit');
    botDetector.checkAllHoneypots();
    // END BOT DETECTION

    Data.setProlificId(prolificId);
    UI.hideProlificScreen();
    loadStudyData();
}

function startNewItem() {
    Data.resetItemState();
    UI.displayNewItem();
    UI.showInstructionScreen();

    // START BOT DETECTION - Start timing instruction page 1
    timingTracker.startTimer('instruction_page_1');
    // END BOT DETECTION
}

function handleNextTurn() {
    if (Data.state.currentTurnIndex >= Data.state.currentItem.turns.length) {
        return;
    }

    // START BOT DETECTION - Track time per turn
    // End previous turn timer and start new one (except for very first turn)
    if (Data.state.currentTurnIndex > 0) {
        const turnTime = timingTracker.endTimer('current_turn');
        timingTracker.recordTurnTiming(turnTime);
        console.log(`[Bot Detection] Turn ${Data.state.currentTurnIndex} completed in ${turnTime}ms`);
    }

    // Always start timer for the turn we're about to show
    timingTracker.startTimer('current_turn');
    interactionTracker.incrementClickNav();
    // END BOT DETECTION

    const turn = Data.state.currentItem.turns[Data.state.currentTurnIndex];
    Data.incrementTurn();

    UI.renderTurn(turn, Data.state.currentTurnIndex);

    // If reached end of conversation
    if (Data.state.currentTurnIndex >= Data.state.currentItem.turns.length) {
        // If all messages are already complete, show complete button
        if (Data.allMessagesComplete()) {
            UI.showCompleteButton();
        } else {
            // Show "Mark Remaining as Not Relevant" button
            UI.showMarkAllNotRelevantButton();
        }
    }
}

function handleCardClick(messageIndex) {
    if (!Data.canSendMessage(messageIndex)) {
        return;
    }

    selectedMessageIndex = messageIndex;

    // Populate preview box with message
    UI.showPreview(messageIndex);

    // Enable send button
    const sendBtn = document.getElementById('btn-send');
    if (sendBtn) {
        sendBtn.disabled = false;
    }
}

function handleSendClick() {
    if (selectedMessageIndex === null) {
        return;
    }

    // Clear any previous reasoning and errors
    const reasoningInput = document.getElementById('reasoning-input');
    const reasoningError = document.getElementById('reasoning-error');
    if (reasoningInput) reasoningInput.value = '';
    if (reasoningError) reasoningError.classList.add('hidden');

    // Show confirmation area (replaces preview + action bar)
    UI.showConfirmationArea();

    // Focus the reasoning input
    if (reasoningInput) {
        setTimeout(() => reasoningInput.focus(), 100);
    }
}

async function handleConfirmYes() {
    if (selectedMessageIndex === null) {
        return;
    }

    // Validate reasoning input
    const reasoningInput = document.getElementById('reasoning-input');
    const reasoningError = document.getElementById('reasoning-error');
    const reasoning = reasoningInput ? reasoningInput.value.trim() : '';

    // Require at least 10 characters for a meaningful explanation
    if (reasoning.length < 10) {
        if (reasoningError) {
            reasoningError.classList.remove('hidden');
        }
        if (reasoningInput) {
            reasoningInput.focus();
            reasoningInput.style.borderColor = '#dc2626';
        }
        return;
    }

    // Hide error if it was showing
    if (reasoningError) {
        reasoningError.classList.add('hidden');
    }
    if (reasoningInput) {
        reasoningInput.style.borderColor = '';
    }

    const messageIndex = selectedMessageIndex;

    // Record the choice with reasoning
    Data.setMessageChoice(messageIndex, Data.state.currentTurnIndex, false, reasoning);

    // Update the card status
    UI.updateMessageCardStatus(messageIndex);

    // Add message to conversation (not preview)
    UI.renderUserMessage(messageIndex, false);

    // Hide confirmation, show preview + action bar again
    UI.hideConfirmationArea();

    // Clear selection and preview
    selectedMessageIndex = null;
    UI.clearPreview();

    // START BOT DETECTION - Collect current state before submission
    const timingData = timingTracker.getAllTimings();
    const interactionData = interactionTracker.getInteractionData();

    botDetector.checkAllHoneypots();
    botDetector.checkTimingViolations(timingData);
    botDetector.checkInteractionViolations(interactionData);

    const botDetectionData = {
        ...botDetector.getDetailedData(),
        timing: timingData,
        interaction: interactionData
    };

    Data.setBotDetectionData(botDetectionData);
    // END BOT DETECTION

    // Try to submit to backend
    const result = await Data.submitMessageResult(messageIndex);

    if (!result.success) {
        console.error('Failed to submit result:', result.error);
        alert('Failed to save your response. Please try again.');
        // Revert the status
        const message = Data.getMessage(messageIndex);
        if (message) {
            message.status = 'pending';
            message.userChoice = null;
            message.reasoning = null;
        }
        UI.updateMessageCardStatus(messageIndex);
        UI.removeUserMessage(messageIndex);
        return;
    }

    // Check if all messages are now complete
    if (Data.allMessagesComplete()) {
        UI.showCompleteButton();
    }
}

function handleConfirmNo() {
    // Clear any error state
    const reasoningError = document.getElementById('reasoning-error');
    const reasoningInput = document.getElementById('reasoning-input');
    if (reasoningError) {
        reasoningError.classList.add('hidden');
    }
    if (reasoningInput) {
        reasoningInput.style.borderColor = '';
    }

    // Hide confirmation, show preview + action bar again
    UI.hideConfirmationArea();

    // Keep preview populated but allow user to change selection
}

async function handleNotRelevant(messageIndex) {
    if (!Data.canSendMessage(messageIndex)) {
        return;
    }

    // Record as not relevant
    Data.setMessageChoice(messageIndex, null, true);

    // Update the card status
    UI.updateMessageCardStatus(messageIndex);

    // START BOT DETECTION - Collect current state before submission
    const timingData = timingTracker.getAllTimings();
    const interactionData = interactionTracker.getInteractionData();

    botDetector.checkAllHoneypots();
    botDetector.checkTimingViolations(timingData);
    botDetector.checkInteractionViolations(interactionData);

    const botDetectionData = {
        ...botDetector.getDetailedData(),
        timing: timingData,
        interaction: interactionData
    };

    Data.setBotDetectionData(botDetectionData);
    // END BOT DETECTION

    // Try to submit to backend
    const result = await Data.submitMessageResult(messageIndex);

    if (!result.success) {
        console.error('Failed to submit result:', result.error);
        alert('Failed to save your response. Please try again.');
        // Revert the status
        const message = Data.getMessage(messageIndex);
        if (message) {
            message.status = 'pending';
        }
        UI.updateMessageCardStatus(messageIndex);
        return false;
    }

    return true;
}

async function handleMarkAllNotRelevant() {
    // Get all pending messages
    const pendingMessages = Data.getAllMessages().filter(m => m.status === 'pending');

    if (pendingMessages.length === 0) {
        return;
    }

    // Mark all as not relevant
    for (const message of pendingMessages) {
        const success = await handleNotRelevant(message.messageIndex);
        if (!success) {
            // Stop if one fails
            return;
        }
    }

    // Show complete button
    UI.showCompleteButton();
}

function handleComplete() {
    // START BOT DETECTION - Final checks and data collection
    timingTracker.endTimer('task_duration');
    timingTracker.endTimer('current_turn');
    botDetector.checkAllHoneypots();

    const timingData = timingTracker.getAllTimings();
    const interactionData = interactionTracker.getInteractionData();

    botDetector.checkTimingViolations(timingData);
    botDetector.checkInteractionViolations(interactionData);

    const botDetectionData = {
        ...botDetector.getDetailedData(),
        timing: timingData,
        interaction: interactionData
    };

    console.log('[Bot Detection] Final Report:', botDetectionData);
    console.log('[Bot Detection] Score:', botDetectionData.score,
                'Flagged:', botDetectionData.isFlagged,
                'Suspicious:', botDetectionData.isSuspicious);

    // Store for submission
    Data.setBotDetectionData(botDetectionData);
    // END BOT DETECTION

    UI.showCompletionScreen();
}

function handleKeyboardShortcuts(e) {
    // Don't process shortcuts if on prolific, instruction, or completion screen
    if (!document.getElementById('prolific-screen').classList.contains('hidden') ||
        !document.getElementById('instruction-screen-1').classList.contains('hidden') ||
        !document.getElementById('instruction-screen-2').classList.contains('hidden') ||
        !document.getElementById('completion-screen').classList.contains('hidden')) {
        return;
    }

    // Don't process if confirmation is showing
    const confirmationArea = document.getElementById('confirmation-area');
    if (confirmationArea && !confirmationArea.classList.contains('hidden')) {
        return;
    }

    // Arrow right or 'n' - Next turn
    if (e.key === 'ArrowRight' || e.key === 'n') {
        e.preventDefault();
        const btnNext = document.getElementById('btn-next');
        if (btnNext && !btnNext.disabled) {
            handleNextTurn();
        }
    }
}

document.addEventListener('DOMContentLoaded', init);
