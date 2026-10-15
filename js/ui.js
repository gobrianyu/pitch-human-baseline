/**
 * UI module
 * Handles all DOM manipulation and rendering
 */

import { state, getAnonymizedSpeaker, getAllMessages, getMessage, canSendMessage, allMessagesComplete } from './data.js?v=20260925A';
import { config } from './config.js?v=20260925A';

export function configureMarkdown() {
    marked.setOptions({
        gfm: true,
        breaks: true
    });

    const renderer = new marked.Renderer();
    const originalLinkRenderer = renderer.link.bind(renderer);
    renderer.link = function(href, title, text) {
        const html = originalLinkRenderer(href, title, text);
        return html.replace('<a', '<a target="_blank" rel="noopener noreferrer"');
    };
    marked.setOptions({ renderer });
}

export function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
}

export function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
    const app = document.getElementById('app');
    app.classList.remove('hidden');
    app.style.display = 'block';
}

export function showProlificScreen() {
    const screen = document.getElementById('prolific-screen');
    screen.classList.remove('hidden');
    screen.style.display = 'flex';
    document.getElementById('prolific-id').focus();
}

export function hideProlificScreen() {
    const screen = document.getElementById('prolific-screen');
    screen.classList.add('hidden');
    screen.style.display = 'none';
}

export function showProlificError() {
    document.getElementById('prolific-error').classList.remove('hidden');
}

export function showCompletionScreen() {
    const completionScreen = document.getElementById('completion-screen');
    completionScreen.classList.remove('hidden');
    completionScreen.style.display = 'flex';

    // Hide all other screens
    document.getElementById('app').classList.add('hidden');
    document.getElementById('app').style.display = 'none';
    hideInstructionScreen();

    // Redirect to Prolific after delay
    setTimeout(() => {
        window.location.href = config.prolificCompletionUrl;
    }, config.redirectDelayMs);
}

export function showInstructionScreen() {
    showInstructionScreen1();
}

export function showInstructionScreen1() {
    const screen1 = document.getElementById('instruction-screen-1');
    const screen2 = document.getElementById('instruction-screen-2');
    screen1.classList.remove('hidden');
    screen1.style.display = 'flex';
    screen2.classList.add('hidden');
    screen2.style.display = 'none';
}

export function showInstructionScreen2() {
    const screen1 = document.getElementById('instruction-screen-1');
    const screen2 = document.getElementById('instruction-screen-2');
    screen1.classList.add('hidden');
    screen1.style.display = 'none';
    screen2.classList.remove('hidden');
    screen2.style.display = 'flex';
}

export function hideInstructionScreen() {
    const screen1 = document.getElementById('instruction-screen-1');
    const screen2 = document.getElementById('instruction-screen-2');
    screen1.classList.add('hidden');
    screen1.style.display = 'none';
    screen2.classList.add('hidden');
    screen2.style.display = 'none';
}

export function displayNewItem() {
    const messages = getAllMessages();

    // Populate instruction screen with all 3 messages
    messages.forEach((message, index) => {
        const messageIndex = message.messageIndex;
        const instructionMessageEl = document.getElementById(`instruction-message-${messageIndex}`);
        if (instructionMessageEl) {
            instructionMessageEl.innerHTML = marked.parse(message.message);
        }
    });

    // Populate main app with all 3 messages
    messages.forEach((message, index) => {
        const messageIndex = message.messageIndex;
        const messageTextEl = document.getElementById(`message-text-${messageIndex}`);
        if (messageTextEl) {
            messageTextEl.innerHTML = marked.parse(message.message);
        }

        // Update card status
        updateMessageCardStatus(messageIndex);
    });

    document.getElementById('conversation').innerHTML = '';

    resetButtons();
}

export function updateMessageCardStatus(messageIndex) {
    const message = getMessage(messageIndex);
    if (!message) return;

    const card = document.getElementById(`message-card-${messageIndex}`);
    const statusBadge = document.getElementById(`status-badge-${messageIndex}`);

    // Update card class
    card.classList.remove('sent', 'not-relevant', 'clickable');
    statusBadge.classList.remove('sent', 'not-relevant');
    statusBadge.textContent = '';

    if (message.status === 'sent') {
        card.classList.add('sent');
        statusBadge.textContent = '✓ Sent';
        statusBadge.classList.add('sent');
    } else if (message.status === 'not_relevant') {
        card.classList.add('not-relevant');
        statusBadge.textContent = 'Not Relevant';
        statusBadge.classList.add('not-relevant');
    } else {
        card.classList.add('clickable');
    }
}

export function resetButtons() {
    const btnNext = document.getElementById('btn-next');
    const btnComplete = document.getElementById('btn-complete');
    const btnSend = document.getElementById('btn-send');
    const btnMarkAllNotRelevant = document.getElementById('btn-mark-all-not-relevant');

    if (btnNext) btnNext.disabled = false;
    if (btnComplete) {
        btnComplete.classList.add('hidden');
        btnComplete.disabled = true;
    }
    if (btnSend) btnSend.disabled = true;
    if (btnMarkAllNotRelevant) {
        btnMarkAllNotRelevant.classList.add('hidden');
        btnMarkAllNotRelevant.disabled = true;
    }
}

export function showMarkAllNotRelevantButton() {
    const btnMarkAllNotRelevant = document.getElementById('btn-mark-all-not-relevant');
    const btnNext = document.getElementById('btn-next');

    if (btnMarkAllNotRelevant) {
        btnMarkAllNotRelevant.classList.remove('hidden');
        btnMarkAllNotRelevant.disabled = false;
    }

    if (btnNext) {
        btnNext.classList.add('hidden');
        btnNext.disabled = true;
    }
}

export function showCompleteButton() {
    const btnComplete = document.getElementById('btn-complete');
    const btnNext = document.getElementById('btn-next');
    const btnMarkAllNotRelevant = document.getElementById('btn-mark-all-not-relevant');

    if (btnComplete) {
        btnComplete.classList.remove('hidden');
        btnComplete.disabled = false;
    }

    if (btnNext) {
        btnNext.classList.add('hidden');
        btnNext.disabled = true;
    }

    if (btnMarkAllNotRelevant) {
        btnMarkAllNotRelevant.classList.add('hidden');
        btnMarkAllNotRelevant.disabled = true;
    }
}

export function renderTurn(turn, turnNumber) {
    const conversationDiv = document.getElementById('conversation');

    const previousCurrent = conversationDiv.querySelector('.chat-bubble.current');
    if (previousCurrent) {
        previousCurrent.classList.remove('current');
    }

    const anonymizedSpeaker = getAnonymizedSpeaker(turn.speaker);

    // Extract speaker number from anonymized speaker (e.g., "P1" -> 0, "P2" -> 1)
    const speakerNumber = parseInt(anonymizedSpeaker.replace('P', '')) - 1;
    const speakerClass = `speaker-${speakerNumber % 8}`; // Cycle through 8 colors

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `chat-bubble ${speakerClass} current`;
    bubbleDiv.innerHTML = `
        <div class="chat-bubble-header">${anonymizedSpeaker}</div>
        <div class="chat-bubble-text">${turn.text}</div>
    `;
    conversationDiv.appendChild(bubbleDiv);

    const scrollContainer = document.getElementById('chat-messages');
    if (scrollContainer) {
        setTimeout(() => {
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
            });
        }, 50);
    }
}

export function disableNextButton() {
    const btnNext = document.getElementById('btn-next');
    if (btnNext) btnNext.disabled = true;
}

export function setupScenarioToggle() {
    // Scenario removed - no longer needed
}

export function renderUserMessage(messageIndex, isPreview = true) {
    const conversationDiv = document.getElementById('conversation');
    const message = getMessage(messageIndex);
    if (!message) return;

    const userBubble = document.createElement('div');
    userBubble.className = `chat-bubble user-message ${isPreview ? 'preview' : ''}`;
    userBubble.id = `user-message-bubble-${messageIndex}`;
    userBubble.innerHTML = `
        <div class="chat-bubble-header">You ${isPreview ? '(preview)' : ''}</div>
        <div class="chat-bubble-text">${marked.parse(message.message)}</div>
    `;
    conversationDiv.appendChild(userBubble);

    const scrollContainer = document.getElementById('chat-messages');
    if (scrollContainer) {
        setTimeout(() => {
            scrollContainer.scrollTo({
                top: scrollContainer.scrollHeight,
                behavior: 'smooth'
            });
        }, 50);
    }
}

export function removeUserMessage(messageIndex) {
    const userBubble = document.getElementById(`user-message-bubble-${messageIndex}`);
    if (userBubble) {
        userBubble.remove();
    }
}

export function confirmUserMessage(messageIndex) {
    const userBubble = document.getElementById(`user-message-bubble-${messageIndex}`);
    if (userBubble) {
        userBubble.classList.remove('preview');
        const header = userBubble.querySelector('.chat-bubble-header');
        if (header) {
            header.textContent = 'You';
        }
    }
}

export function showPreview(messageIndex) {
    const message = getMessage(messageIndex);
    if (!message) return;

    const previewBox = document.getElementById('preview-box');
    if (previewBox) {
        previewBox.innerHTML = marked.parse(message.message);
        previewBox.classList.add('active');
    }
}

export function clearPreview() {
    const previewBox = document.getElementById('preview-box');
    const sendBtn = document.getElementById('btn-send');

    if (previewBox) {
        previewBox.innerHTML = 'Click a message option on the right to send it at this point →';
        previewBox.classList.remove('active');
    }
    if (sendBtn) {
        sendBtn.disabled = true;
    }
}

export function showConfirmationArea() {
    const confirmationArea = document.getElementById('confirmation-area');
    const previewArea = document.getElementById('preview-area');
    const actionBar = document.getElementById('action-bar');

    if (confirmationArea) confirmationArea.classList.remove('hidden');
    if (previewArea) previewArea.classList.add('hidden');
    if (actionBar) actionBar.classList.add('hidden');
}

export function hideConfirmationArea() {
    const confirmationArea = document.getElementById('confirmation-area');
    const previewArea = document.getElementById('preview-area');
    const actionBar = document.getElementById('action-bar');

    if (confirmationArea) confirmationArea.classList.add('hidden');
    if (previewArea) previewArea.classList.remove('hidden');
    if (actionBar) actionBar.classList.remove('hidden');
}

