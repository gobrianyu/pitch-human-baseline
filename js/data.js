/**
 * Data management module
 * Handles loading eval data and managing application state
 */

import { config } from './config.js?v=20260925A';

export const state = {
    currentItem: null, // The conversation (same for all 3 messages)
    currentTurnIndex: 0,
    speakerMapping: {},
    prolificId: null,
    // Batch information - 3 messages to insert
    batchId: null,
    allMessages: [], // Array of 3 message objects: [{userItemId, item, messageIndex, status, userChoice}, ...]
    // Status can be: 'pending', 'sent', 'not_relevant'
    botDetectionData: null // Bot detection metrics collected during session
};

/**
 * Load conversation and 3 messages from backend
 */
export async function loadData() {
    if (!state.prolificId) {
        throw new Error('Prolific ID not set');
    }

    try {
        const url = `${config.apiBaseUrl}/api/get-item?prolificId=${encodeURIComponent(state.prolificId)}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Store batch information
        state.batchId = data.batchId;

        // The conversation is the same for all messages
        state.currentItem = data.item;

        // Build allMessages array from batch items (all 3 messages with their full data)
        state.allMessages = data.allBatchItems.map(batchItem => ({
            userItemId: batchItem.id,
            messageIndex: batchItem.messageIndex,
            message: batchItem.item.neutralized_ideal_response, // The actual message text
            status: batchItem.status === 'completed' ?
                (batchItem.userChoice !== null ? 'sent' : 'not_relevant') :
                'pending',
            userChoice: batchItem.userChoice,
            reasoning: batchItem.reasoning || null
        }));

        console.log('Loaded batch data:', {
            batchId: state.batchId,
            messageCount: state.allMessages.length,
            conversation: state.currentItem.conversation_id,
            messages: state.allMessages.map(m => ({
                index: m.messageIndex,
                status: m.status
            }))
        });

        return data;
    } catch (error) {
        console.error('Failed to load data from backend:', error);
        throw error;
    }
}

export function resetItemState() {
    state.currentTurnIndex = 0;
    state.speakerMapping = createSpeakerMapping(state.currentItem);
}

/**
 * Get message by index (1, 2, or 3)
 */
export function getMessage(messageIndex) {
    return state.allMessages.find(m => m.messageIndex === messageIndex);
}

/**
 * Get all messages
 */
export function getAllMessages() {
    return state.allMessages;
}

/**
 * Check if a message can be sent (not already sent or marked not relevant)
 */
export function canSendMessage(messageIndex) {
    const message = getMessage(messageIndex);
    return message && message.status === 'pending';
}

/**
 * Check if all messages are complete (sent or not relevant)
 */
export function allMessagesComplete() {
    return state.allMessages.every(m => m.status === 'sent' || m.status === 'not_relevant');
}

/**
 * Get count of messages sent
 */
export function getSentCount() {
    return state.allMessages.filter(m => m.status === 'sent').length;
}

function createSpeakerMapping(item) {
    const mapping = {};
    const uniqueSpeakers = [];

    // Get unique speakers in order of first appearance
    item.turns.forEach(turn => {
        if (!uniqueSpeakers.includes(turn.speaker)) {
            uniqueSpeakers.push(turn.speaker);
        }
    });

    // Map each speaker to P1, P2, P3, etc.
    uniqueSpeakers.forEach((speaker, index) => {
        mapping[speaker] = `P${index + 1}`;
    });

    return mapping;
}

export function getAnonymizedSpeaker(originalSpeaker) {
    return state.speakerMapping[originalSpeaker] || originalSpeaker;
}

export function incrementTurn() {
    state.currentTurnIndex++;
}

/**
 * Set user choice for a specific message
 */
export function setMessageChoice(messageIndex, turnNumber, notRelevant = false, reasoning = null) {
    const message = getMessage(messageIndex);
    if (message) {
        message.userChoice = notRelevant ? null : turnNumber;
        message.status = notRelevant ? 'not_relevant' : 'sent';
        message.reasoning = reasoning;
    }
}

export function setProlificId(id) {
    state.prolificId = id;
}

/**
 * Set bot detection data
 */
export function setBotDetectionData(data) {
    state.botDetectionData = data;
    console.log('[Data] Bot detection data stored:', {
        score: data.score,
        isFlagged: data.isFlagged,
        violationCount: data.violations?.length || 0
    });
}

/**
 * Get current batch progress information
 */
export function getBatchProgress() {
    return {
        messageIndex: state.messageIndex,
        totalMessages: state.totalMessages,
        completedMessages: state.completedMessages,
        isLastMessage: state.messageIndex === state.totalMessages
    };
}

/**
 * Submit a specific message's choice to backend
 */
export async function submitMessageResult(messageIndex) {
    const message = getMessage(messageIndex);
    if (!message) {
        console.error('Message not found:', messageIndex);
        return { success: false, error: 'Message not found' };
    }

    try {
        const url = `${config.apiBaseUrl}/api/complete-item`;

        // Include bot detection data if available
        const payload = {
            userItemId: message.userItemId,
            userChoice: message.userChoice,
            notRelevant: message.status === 'not_relevant',
            reasoning: message.reasoning || null
        };

        // Add bot detection data if it's been collected
        if (state.botDetectionData) {
            payload.botDetectionScore = state.botDetectionData.score || 0;
            payload.botDetectionData = state.botDetectionData;
            payload.flaggedAsBot = state.botDetectionData.isFlagged || false;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log('Message submitted:', {
            messageIndex,
            status: message.status,
            userChoice: message.userChoice,
            botScore: payload.botDetectionScore
        });

        return {
            success: true,
            data
        };
    } catch (error) {
        console.error('Failed to submit result to backend:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Load next item in batch
 */
export function loadNextItemInBatch(nextItemData) {
    state.userItemId = nextItemData.userItemId;
    state.currentItem = nextItemData.item;
    state.messageIndex = nextItemData.messageIndex;

    console.log('Loaded next item in batch:', {
        messageIndex: state.messageIndex,
        progress: `${state.completedMessages}/${state.totalMessages}`
    });
}
