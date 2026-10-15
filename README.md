# Message Placement Study Platform

A modular web application for conducting human annotation studies on message placement in conversations. Perfect for researchers studying conversational AI, dialogue systems, or human-AI interaction.

📖 **Quick Links:**
- [5-Minute Setup Guide](QUICKSTART.md) - Get started quickly with local hosting
- [Complete Hosting Guide](HOSTING.md) - Detailed instructions & troubleshooting
- [Production Deployment](DEPLOY.md) - Deploy to cloud platforms

## Project Structure

```
message-placement-study/
├── index.html              # Main study interface
├── results.html            # Results summary page
├── server.js               # Express backend server (optional)
├── package.json            # Node.js dependencies
├── css/
│   ├── styles.css         # Main application styles
│   └── results.css        # Results page styles
├── js/
│   ├── app.js             # Main application orchestration
│   ├── data.js            # Data loading & state management
│   ├── stats.js           # Statistics tracking
│   ├── ui.js              # DOM manipulation & rendering
│   ├── config.js          # Configuration
│   └── results.js         # Results page logic
└── db/
    └── schema.sql         # Database schema (for backend mode)
```

## Setup

### Frontend Only (Quick Start)
1. Ensure all files are in their correct directories as shown above
2. Open `index.html` in a modern web browser via a local web server
3. Browser must support ES6 modules

### Full Stack (With Database)
1. Install dependencies: `npm install`
2. Set up PostgreSQL database (see [DEPLOY.md](DEPLOY.md))
3. Configure environment: Copy `.env.example` to `.env`
   - Set `DATABASE_URL` for PostgreSQL connection
   - Set `EVAL_PAIRS_URL` to your data source (GitHub URL or local file)
4. Run database setup: `psql $DATABASE_URL -f db/schema.sql`
5. Start server: `npm start`
6. Access at `http://localhost:3000`

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

## Usage

### Basic Flow

1. **Read the message**: At the top, you'll see a message that needs to be inserted into the conversation
2. **Review the scenario**: The conversation topic/scenario is displayed
3. **Advance through turns**: Click "No, Continue" (or press `→` or `n`) to see each conversation turn
4. **Place the message**: When you think the message should be inserted, click "Yes, Place After This Turn!" (or press `Enter` or `Space`)
5. **Not relevant option**: If you reach the last turn and believe the message isn't relevant to the conversation, click "Not Relevant to Conversation" (or press `x`)
6. **Continue**: The tool automatically loads the next item after you make a choice
7. **End study**: Click "End Study & See Results" at any time to see your comprehensive results and export JSON data

### Keyboard Shortcuts

- `Enter` or `Space`: Place message after current turn
- `→` (right arrow) or `n`: Continue to next turn
- `x` or `X`: Mark as not relevant (only available at last turn)

### Results

Results are no longer shown after each item. Instead, you can view comprehensive results at the end of your session by clicking "End Study & See Results". This navigates to a dedicated results page with:
- **Summary statistics**: Visual cards showing completed items, not relevant count, best turn matches, window matches, and accuracy
- **JSON export**: Complete data of all your annotations with a one-click copy button
- **Continue option**: Button to return to the study and complete more items (progress is saved)
- **New session option**: Button to start fresh with a cleared state

### Statistics

The header tracks your overall performance in real-time:
- **Completed**: Total items you've annotated
- **Not Relevant**: How many items you marked as not relevant
- **In Best Turn**: How many times you matched a best turn
- **In Window**: How many times you were within an acceptable window
- **Accuracy**: Percentage of times you were within any window (excludes not-relevant items)

## Deployment Options

### Option 1: Local Hosting with ngrok (Quick Start)
Perfect for small studies or testing:
1. Start local web server
2. Use ngrok to create public tunnel
3. Share URL with participants

📖 **See [QUICKSTART.md](QUICKSTART.md)** for 5-minute setup.
📖 **See [HOSTING.md](HOSTING.md)** for detailed hosting guide.

### Option 2: Production Deployment
For larger studies or persistent hosting:
- Deploy to Render, Railway, Heroku, or similar platforms
- PostgreSQL database for participant data
- Automatic scaling and reliability

📖 **See [DEPLOY.md](DEPLOY.md)** for production deployment guide.

## Data Collection

### Frontend Mode (Browser Storage)
Participants copy JSON data from results page. Each annotation includes:
- `knowledge_item_id`: Unique identifier
- `conversation_id`: Conversation identifier  
- `user_choice`: Turn number chosen (or null if not relevant)
- `not_relevant`: Boolean flag
- `ground_truth`: Annotator consensus data
- Performance metrics and timing data

### Backend Mode (Database)
Data automatically saved to PostgreSQL:
- User responses stored in `user_items` table
- Session tracking in `sessions` table
- Export data via SQL queries (see [DEPLOY.md](DEPLOY.md))

## Creating Your Own Study

### Step 1: Prepare Your Data

Create an `eval_pairs.json` file with your conversations and messages (see format below).

### Step 2: Host Your Data

**Option A: GitHub Repository (Recommended)**
1. Create a public GitHub repository
2. Upload your `eval_pairs.json` file
3. Get the raw file URL: `https://raw.githubusercontent.com/username/repo/main/eval_pairs.json`
4. Set `EVAL_PAIRS_URL` environment variable to this URL

**Option B: Local File**
1. Place `eval_pairs.json` in your project root
2. Set `EVAL_PAIRS_URL=./eval_pairs.json`

### Step 3: Configure & Deploy

1. **Configure**: Update `js/config.js` with your settings
2. **Customize**: Modify `css/styles.css` for your branding
3. **Deploy**: Choose local hosting (see [QUICKSTART.md](QUICKSTART.md)) or production (see [DEPLOY.md](DEPLOY.md))
4. **Collect data**: Via JSON export (frontend) or database (backend)

### Data Format

Your `eval_pairs.json` should be an array of items, each containing:
- `knowledge_item_id`: Unique identifier
- `conversation_id`: Conversation identifier
- `scenario`: Scenario type
- `topic`: Brief description
- `neutralized_ideal_response`: The message to place
- `ground_truth`: Evaluation criteria (optional)
- `conversation`: Array of turns with `turn`, `speaker`, and `utterance`

Example structure:
```json
[
  {
    "knowledge_item_id": "item_001",
    "conversation_id": "conv_001",
    "scenario": "general",
    "topic": "Planning a trip",
    "neutralized_ideal_response": "Don't forget to check the weather!",
    "ground_truth": { "do_not_surface": false },
    "conversation": [
      { "turn": 1, "speaker": "Alice", "utterance": "Let's go hiking this weekend." },
      { "turn": 2, "speaker": "Bob", "utterance": "Great idea! I'll pack my gear." }
    ]
  }
]
```

## Architecture

The application follows a modular architecture with clear separation of concerns:

### Modules

- **app.js** - Main entry point that orchestrates application flow, initializes modules, and handles user events
- **data.js** - Manages application state and data operations (loading, filtering, random selection, result recording)
- **stats.js** - Tracks and displays user performance statistics
- **ui.js** - Handles all DOM manipulation and rendering logic

This modular design makes the code more maintainable, testable, and easier to extend.

## Development

To modify the application:
1. **Styling**: Edit `css/styles.css` and `css/results.css`
2. **Functionality**: Edit JavaScript modules in `js/` directory
3. **Structure**: Modify `index.html` or `results.html`
4. **Backend**: Edit `server.js` and `db/schema.sql` for database changes

The JavaScript modules use ES6 imports/exports and follow a modular architecture for maintainability.

## Design Decisions

### Anonymized Speaker Names
Speaker names are automatically anonymized as P1, P2, P3, etc. This feature:
- Protects privacy
- Prevents bias from name-based assumptions
- Maintains consistency across conversations
- Focuses attention on content rather than identity

Mapping is created per conversation based on order of first appearance.

### Hidden Turn Counts  
Exact conversation lengths are hidden to:
- Prevent bias in placement decisions
- Avoid anchoring effects
- Encourage focus on conversation context over position

Individual turn numbers are shown, but total length remains hidden.

## Technical Features

### Frontend
- ES6 modular architecture
- Session persistence via sessionStorage
- Duplicate prevention (items shown once per session)
- Real-time statistics calculation
- Markdown rendering support
- Keyboard shortcuts for efficiency

### Backend (Optional)
- Express.js server
- PostgreSQL database
- RESTful API endpoints
- Session and user management
- Data export capabilities

### Data Management
- Loads study items from `eval_pairs.json`
- Filters items marked `do_not_surface: true`
- Automatic pool reset when all items completed
- Ground truth comparison for performance metrics
- Configurable via `js/config.js`

## Contributing

Contributions are welcome! To contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

Please maintain the existing code style and add tests for new features.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Citation

If you use this platform in your research, please cite:

```bibtex
@software{message_placement_study,
  title = {Message Placement Study Platform},
  author = {Yu, Brian},
  year = {2026},
  url = {https://github.com/yourusername/message-placement-study}
}
```

## Acknowledgments

Built for researchers studying conversational AI, dialogue systems, and human-AI interaction. Contributions welcome!
