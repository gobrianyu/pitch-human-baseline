// Express server for Render deployment
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Load eval_pairs data
let evalPairsData = null;

// GitHub URL for eval_pairs data (override with EVAL_PAIRS_URL environment variable)
const EVAL_PAIRS_URL = process.env.EVAL_PAIRS_URL ||
    'https://raw.githubusercontent.com/your-username/your-data-repo/main/eval_pairs.json';

async function loadEvalPairs() {
    if (!evalPairsData) {
        try {
            let rawData;

            // Try loading from GitHub URL first
            if (EVAL_PAIRS_URL.startsWith('http')) {
                console.log('Loading eval_pairs from URL:', EVAL_PAIRS_URL);
                const response = await fetch(EVAL_PAIRS_URL);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                rawData = await response.text();
                console.log('Data loaded from URL, size:', rawData.length);
            } else {
                // Fallback to local file
                const dataPath = join(__dirname, EVAL_PAIRS_URL);
                console.log('Loading eval_pairs.json from local file:', dataPath);
                rawData = readFileSync(dataPath, 'utf8');
                console.log('File loaded, size:', rawData.length);
            }

            const allData = JSON.parse(rawData);
            console.log('Parsed JSON, total items:', allData.length);

            // Filter for items that should be surfaced
            // Remove or customize the scenario filter for your needs
            evalPairsData = allData.filter(item =>
                !item.ground_truth.do_not_surface
                // Optional: Add scenario filtering, e.g.: && item.scenario === 'your_scenario'
            );
            console.log('Filtered items:', evalPairsData.length);
        } catch (error) {
            console.error('Error loading eval_pairs data:', error);
            throw new Error(`Failed to load eval_pairs: ${error.message}`);
        }
    }
    return evalPairsData;
}

// Database utility functions
async function getOrCreateUser(prolificId) {
    const result = await pool.query(
        `INSERT INTO users (prolific_id)
         VALUES ($1)
         ON CONFLICT (prolific_id)
         DO UPDATE SET prolific_id = EXCLUDED.prolific_id
         RETURNING id, prolific_id, created_at`,
        [prolificId]
    );
    return result.rows[0];
}

async function getCurrentSession(userId) {
    let result = await pool.query(
        `SELECT * FROM sessions
         WHERE user_id = $1
         ORDER BY session_number DESC
         LIMIT 1`,
        [userId]
    );

    if (result.rows.length === 0) {
        // Create first session
        result = await pool.query(
            `INSERT INTO sessions (user_id, session_number)
             VALUES ($1, 1)
             RETURNING *`,
            [userId]
        );
    }

    return result.rows[0];
}

async function getIncompleteItem(userId, sessionId) {
    const result = await pool.query(
        `SELECT * FROM user_items
         WHERE user_id = $1
         AND session_id = $2
         AND status = 'in_progress'
         AND batch_id IS NOT NULL
         ORDER BY batch_id DESC, message_index ASC
         LIMIT 1`,
        [userId, sessionId]
    );
    return result.rows[0] || null;
}

async function getBatchItems(userId, sessionId, batchId) {
    const result = await pool.query(
        `SELECT * FROM user_items
         WHERE user_id = $1
         AND session_id = $2
         AND batch_id = $3
         ORDER BY message_index ASC`,
        [userId, sessionId, batchId]
    );
    return result.rows;
}

async function getBatchProgress(userId, sessionId, batchId) {
    const result = await pool.query(
        `SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'completed') as completed
         FROM user_items
         WHERE user_id = $1
         AND session_id = $2
         AND batch_id = $3`,
        [userId, sessionId, batchId]
    );
    return result.rows[0];
}

async function getUsedItemIds(userId) {
    const result = await pool.query(
        `SELECT knowledge_item_id FROM user_items
         WHERE user_id = $1`,
        [userId]
    );
    return result.rows.map(row => row.knowledge_item_id);
}

async function getUsedConversationIds(userId) {
    const result = await pool.query(
        `SELECT DISTINCT conversation_id FROM user_items
         WHERE user_id = $1`,
        [userId]
    );
    return result.rows.map(row => row.conversation_id);
}

async function assignItemToUser(userId, sessionId, item, batchId = null, messageIndex = null) {
    const result = await pool.query(
        `INSERT INTO user_items (
            user_id,
            session_id,
            knowledge_item_id,
            conversation_id,
            batch_id,
            message_index,
            status,
            ground_truth,
            item_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', $7, $8)
        RETURNING *`,
        [
            userId,
            sessionId,
            item.knowledge_item_id,
            item.conversation_id,
            batchId,
            messageIndex,
            JSON.stringify(item.ground_truth),
            JSON.stringify(item)
        ]
    );
    return result.rows[0];
}

async function assignBatchToUser(userId, sessionId, items) {
    // Generate a unique batch ID
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const assignedItems = [];
    for (let i = 0; i < items.length; i++) {
        const userItem = await assignItemToUser(
            userId,
            sessionId,
            items[i],
            batchId,
            i + 1 // message_index is 1-based
        );
        assignedItems.push(userItem);
    }

    return { batchId, items: assignedItems };
}

async function completeItem(userItemId, userChoice, notRelevant, reasoning = null, botDetectionScore = 0, botDetectionData = {}, flaggedAsBot = false) {
    const result = await pool.query(
        `UPDATE user_items
         SET
            status = 'completed',
            user_choice = $2,
            not_relevant = $3,
            reasoning = $4,
            bot_detection_score = $5,
            bot_detection_data = $6,
            flagged_as_bot = $7,
            interaction_timings = $8,
            completed_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [
            userItemId,
            userChoice,
            notRelevant,
            reasoning,
            botDetectionScore,
            JSON.stringify(botDetectionData),
            flaggedAsBot,
            JSON.stringify(botDetectionData.timing || {})
        ]
    );
    return result.rows[0];
}

// Helper function to find 3 unique messages from same conversation
function findThreeMessagesFromSameConversation(evalPairs, usedItemIds, usedConversationIds) {
    // Group items by conversation_id
    const conversationGroups = {};

    for (const item of evalPairs) {
        // Skip if this specific message was already used
        if (usedItemIds.includes(item.knowledge_item_id)) {
            continue;
        }

        // Skip if this conversation was already used by this user
        if (usedConversationIds.includes(item.conversation_id)) {
            continue;
        }

        const convId = item.conversation_id;
        if (!conversationGroups[convId]) {
            conversationGroups[convId] = [];
        }
        conversationGroups[convId].push(item);
    }

    // Find all conversations with at least 3 unused messages
    const eligibleConversations = [];
    for (const convId in conversationGroups) {
        const messages = conversationGroups[convId];
        if (messages.length >= 3) {
            eligibleConversations.push({ convId, messages });
        }
    }

    if (eligibleConversations.length === 0) {
        return null;
    }

    // Randomly select one conversation
    const randomConversation = eligibleConversations[Math.floor(Math.random() * eligibleConversations.length)];

    // Randomly select 3 messages from this conversation
    const shuffled = randomConversation.messages.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
}

// API Routes

// GET /api/get-item - Get or assign a batch of 3 conversation items for a user
app.get('/api/get-item', async (req, res) => {
    console.log('GET /api/get-item called with:', req.query);
    try {
        const { prolificId } = req.query;

        if (!prolificId) {
            return res.status(400).json({ error: 'Prolific ID is required' });
        }

        console.log('Getting or creating user for:', prolificId);
        // Get or create user
        const user = await getOrCreateUser(prolificId);
        console.log('User:', user);

        // Get current session
        const session = await getCurrentSession(user.id);

        // Check for incomplete batch (any message not completed)
        let currentItem = await getIncompleteItem(user.id, session.id);

        if (currentItem) {
            // Get all items in the batch
            const allBatchItems = await getBatchItems(user.id, session.id, currentItem.batch_id);

            console.log('Returning existing batch with', allBatchItems.length, 'items');

            // Return all 3 items with full data
            return res.status(200).json({
                batchId: currentItem.batch_id,
                item: currentItem.item_data, // Conversation (same for all)
                allBatchItems: allBatchItems.map(item => ({
                    id: item.id,
                    messageIndex: item.message_index,
                    status: item.status,
                    userChoice: item.user_choice,
                    notRelevant: item.not_relevant,
                    item: item.item_data // Full message data
                })),
                isExisting: true
            });
        }

        // No incomplete item, assign a new batch of 3 messages
        const evalPairs = await loadEvalPairs();
        const usedItemIds = await getUsedItemIds(user.id);
        const usedConversationIds = await getUsedConversationIds(user.id);

        // Find 3 unique messages from same conversation (excluding already-used conversations)
        const threeMessages = findThreeMessagesFromSameConversation(evalPairs, usedItemIds, usedConversationIds);

        if (!threeMessages) {
            return res.status(404).json({ error: 'No more conversation batches available. You may have already completed all available conversations.' });
        }

        console.log('Assigning new batch of 3 messages from conversation:', threeMessages[0].conversation_id);

        // Assign batch to user
        const batch = await assignBatchToUser(user.id, session.id, threeMessages);

        // Return all 3 items with full data
        return res.status(200).json({
            batchId: batch.batchId,
            item: threeMessages[0], // Conversation (same for all)
            allBatchItems: batch.items.map((item, index) => ({
                id: item.id,
                messageIndex: item.message_index,
                status: 'in_progress',
                userChoice: null,
                notRelevant: false,
                item: threeMessages[index] // Full message data for each
            })),
            isExisting: false
        });

    } catch (error) {
        console.error('Error in get-item:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// POST /api/complete-item - Mark an item as complete and get next item in batch if available
app.post('/api/complete-item', async (req, res) => {
    try {
        const {
            userItemId,
            userChoice,
            notRelevant,
            reasoning = null,
            botDetectionScore = 0,
            botDetectionData = {},
            flaggedAsBot = false
        } = req.body;

        if (!userItemId) {
            return res.status(400).json({ error: 'User item ID is required' });
        }

        // Get the item before completing to know its batch info
        const itemResult = await pool.query(
            'SELECT * FROM user_items WHERE id = $1',
            [userItemId]
        );

        if (itemResult.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const currentItem = itemResult.rows[0];

        // Log bot detection if flagged
        if (flaggedAsBot || botDetectionScore > 20) {
            console.log('[Bot Detection] Suspicious activity detected:', {
                userItemId,
                score: botDetectionScore,
                flagged: flaggedAsBot,
                violations: botDetectionData.violations?.length || 0
            });
        }

        // Complete the item with bot detection data
        const completedItem = await completeItem(
            userItemId,
            notRelevant ? null : userChoice,
            notRelevant || false,
            reasoning,
            botDetectionScore,
            botDetectionData,
            flaggedAsBot
        );

        // Log individual bot flags to bot_flags table if violations exist
        if (botDetectionData.violations && botDetectionData.violations.length > 0) {
            for (const violation of botDetectionData.violations) {
                try {
                    await pool.query(
                        `INSERT INTO bot_flags
                         (user_id, session_id, user_item_id, flag_type, flag_reason,
                          flag_data, severity, points_added)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                        [
                            currentItem.user_id,
                            currentItem.session_id,
                            userItemId,
                            violation.type,
                            `Bot detection violation: ${violation.type}`,
                            JSON.stringify(violation.data),
                            violation.severity,
                            violation.points
                        ]
                    );
                } catch (flagError) {
                    console.error('Error inserting bot flag:', flagError);
                    // Don't fail the request if flag logging fails
                }
            }
        }

        // Get batch progress
        const batchProgress = await getBatchProgress(
            currentItem.user_id,
            currentItem.session_id,
            currentItem.batch_id
        );

        const allBatchComplete = parseInt(batchProgress.completed) === parseInt(batchProgress.total);

        // Get next incomplete item in batch
        const nextItem = await getIncompleteItem(
            currentItem.user_id,
            currentItem.session_id
        );

        return res.status(200).json({
            success: true,
            completedItem,
            batchProgress: {
                completed: parseInt(batchProgress.completed),
                total: parseInt(batchProgress.total),
                allComplete: allBatchComplete
            },
            nextItem: nextItem ? {
                userItemId: nextItem.id,
                item: nextItem.item_data,
                messageIndex: nextItem.message_index
            } : null,
            botDetectionScore: botDetectionScore,
            flaggedAsBot: flaggedAsBot
        });

    } catch (error) {
        console.error('Error in complete-item:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// GET /api/bot-review - Get flagged/suspicious submissions for review
app.get('/api/bot-review', async (req, res) => {
    try {
        const { minScore = 21, limit = 100 } = req.query;

        const result = await pool.query(
            `SELECT
                ui.id,
                ui.user_id,
                u.prolific_id,
                ui.session_id,
                ui.knowledge_item_id,
                ui.message_index,
                ui.bot_detection_score,
                ui.flagged_as_bot,
                ui.bot_detection_data,
                ui.completed_at,
                (SELECT COUNT(*) FROM bot_flags WHERE user_item_id = ui.id) as flag_count
             FROM user_items ui
             JOIN users u ON ui.user_id = u.id
             WHERE ui.bot_detection_score >= $1
             ORDER BY ui.bot_detection_score DESC, ui.completed_at DESC
             LIMIT $2`,
            [minScore, limit]
        );

        res.json({
            success: true,
            count: result.rows.length,
            items: result.rows
        });

    } catch (error) {
        console.error('Error fetching bot review data:', error);
        res.status(500).json({
            error: 'Internal server error',
            success: false
        });
    }
});

// GET /api/bot-flags/:userItemId - Get detailed flags for a specific item
app.get('/api/bot-flags/:userItemId', async (req, res) => {
    try {
        const { userItemId } = req.params;

        const result = await pool.query(
            `SELECT * FROM bot_flags
             WHERE user_item_id = $1
             ORDER BY created_at ASC`,
            [userItemId]
        );

        res.json({
            success: true,
            flags: result.rows
        });

    } catch (error) {
        console.error('Error fetching bot flags:', error);
        res.status(500).json({
            error: 'Internal server error',
            success: false
        });
    }
});

// GET /api/bot-stats - Get summary statistics of bot detection
app.get('/api/bot-stats', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                COUNT(*) as total_submissions,
                COUNT(*) FILTER (WHERE bot_detection_score >= 51) as flagged_count,
                COUNT(*) FILTER (WHERE bot_detection_score >= 21 AND bot_detection_score < 51) as suspicious_count,
                COUNT(*) FILTER (WHERE bot_detection_score < 21) as clean_count,
                AVG(bot_detection_score) as avg_score,
                MAX(bot_detection_score) as max_score
             FROM user_items
             WHERE status = 'completed'
             AND bot_detection_score IS NOT NULL`
        );

        res.json({
            success: true,
            stats: result.rows[0]
        });

    } catch (error) {
        console.error('Error fetching bot stats:', error);
        res.status(500).json({
            error: 'Internal server error',
            success: false
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
        console.error('DATABASE_URL is set:', !!process.env.DATABASE_URL);
    } else {
        console.log('Database connected successfully at:', res.rows[0].now);
    }
});

// Start server
app.listen(port, async () => {
    console.log(`Server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`DATABASE_URL is set:`, !!process.env.DATABASE_URL);
    console.log(`Eval pairs source: ${EVAL_PAIRS_URL}`);

    // Try to load eval_pairs on startup to catch errors early
    try {
        await loadEvalPairs();
        console.log('eval_pairs data loaded successfully');
    } catch (error) {
        console.error('Failed to load eval_pairs data on startup:', error);
    }
});
