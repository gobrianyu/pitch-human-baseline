-- Database schema for Proski Human Annotations study

-- Users table (stores Prolific participants)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    prolific_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(prolific_id)
);

-- Sessions table (for future multi-item sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, session_number)
);

-- User items table (tracks assigned conversation items)
CREATE TABLE IF NOT EXISTS user_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    knowledge_item_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255) NOT NULL,
    batch_id VARCHAR(255), -- Links 3 messages assigned together
    message_index INTEGER, -- 1, 2, or 3 within the batch
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    user_choice INTEGER, -- Turn number where message was placed, NULL if not relevant
    not_relevant BOOLEAN DEFAULT FALSE,
    reasoning TEXT, -- User's explanation for their message placement decision
    ground_truth JSONB, -- Store ground truth data for analysis
    item_data JSONB, -- Store full item data
    bot_detection_score INTEGER DEFAULT 0, -- Cumulative bot-detection score
    bot_detection_data JSONB, -- Full bot-detection report (violations, timing, interaction)
    flagged_as_bot BOOLEAN DEFAULT FALSE,
    interaction_timings JSONB, -- Timing measurements collected client-side
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    CHECK (status IN ('in_progress', 'completed')),
    CHECK (message_index IN (1, 2, 3) OR message_index IS NULL),
    -- Prevent duplicate message insertions by same user
    UNIQUE(user_id, knowledge_item_id, user_choice)
);

-- Upgrade path for databases created before bot detection was added
ALTER TABLE user_items ADD COLUMN IF NOT EXISTS bot_detection_score INTEGER DEFAULT 0;
ALTER TABLE user_items ADD COLUMN IF NOT EXISTS bot_detection_data JSONB;
ALTER TABLE user_items ADD COLUMN IF NOT EXISTS flagged_as_bot BOOLEAN DEFAULT FALSE;
ALTER TABLE user_items ADD COLUMN IF NOT EXISTS interaction_timings JSONB;

-- Bot flags table (individual bot-detection violations)
CREATE TABLE IF NOT EXISTS bot_flags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    user_item_id INTEGER NOT NULL REFERENCES user_items(id) ON DELETE CASCADE,
    flag_type VARCHAR(100) NOT NULL,
    flag_reason TEXT,
    flag_data JSONB,
    severity VARCHAR(50),
    points_added INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bot_flags_user_item_id ON bot_flags(user_item_id);
CREATE INDEX IF NOT EXISTS idx_user_items_bot_score ON user_items(bot_detection_score);
CREATE INDEX IF NOT EXISTS idx_users_prolific_id ON users(prolific_id);
CREATE INDEX IF NOT EXISTS idx_user_items_user_id ON user_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_items_status ON user_items(status);
CREATE INDEX IF NOT EXISTS idx_user_items_session_id ON user_items(session_id);
CREATE INDEX IF NOT EXISTS idx_user_items_batch_id ON user_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_user_items_knowledge_item_id ON user_items(knowledge_item_id);
