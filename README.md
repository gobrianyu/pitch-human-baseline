# Message Placement Study Platform

A modular web application for conducting human annotation studies on message placement in conversations. Perfect for researchers studying conversational AI, dialogue systems, or human-AI interaction.

**External Links:**
- [PITCH Benchmark (GitHub)](https://github.com/Social-Futures-Lab/pitch) - Annotation system and full research project; main repository
- [Project Website](https://social.cs.washington.edu/PITCH-website/) - Learn more about PITCH
- [Benchmark Data](https://github.com/Social-Futures-Lab/pitch/blob/master/data/pitch-benchmark-data.json) - PITCH benchmark dataset
- [Human Baseline Data](https://github.com/Social-Futures-Lab/pitch/blob/master/data/human-baseline-data.csv) - Human annotation experiment data

## Project Structure

```
message-placement-study/
├── index.html                # Main study interface
├── server.js                 # Express server: serves the app and API, stores data in PostgreSQL
├── package.json              # Node.js dependencies
├── css/
│   └── styles.css            # Application styles
├── js/
│   ├── app.js                # Main application orchestration
│   ├── data.js               # Data loading & state management
│   ├── ui.js                 # DOM manipulation & rendering
│   ├── config.js             # Configuration
│   ├── botDetection.js       # Honeypot and bot-detection checks
│   ├── timingTracker.js      # Timing measurements
│   └── interactionTracker.js # Interaction tracking
└── db/
    └── schema.sql            # PostgreSQL database schema
```

## Setup & Deployment

This app requires a Node.js server and a PostgreSQL database. See the following resources:
* [QUICKSTART.md](QUICKSTART.md): Run the study locally and share it with a tunnel
* [HOSTING.md](HOSTING.md): Host from your own machine via ngrok
* [DEPLOY.md](DEPLOY.md): Deploy to Render or similar, manage the database, export data

Configuration lives in `.env` (see `.env.example`): `DATABASE_URL` and `STUDY_DATA_URL`.

## Usage

### Basic Flow

1. Read and check the consent text, and review task instructions.
2. Read the three messages you will consider, then begin. Each message must be evaluated **independently**.
3. The conversation is revealed one turn at a time. Click "See Next Turn" to move forward.
4. When a message fits at the current point, click it in the right panel to preview it, then click "Send" below the chat. Enter a short explanation of your reasoning before submitting.
   - You can send multiple messages at the same turn
   - Each message can only be sent once
5. At the last turn, if any messages remain unsent, mark the remaining messages as not relevant.

## Data Collection

Each response is saved to PostgreSQL as the participant goes, one row per message in `user_items`, including the turn chosen (`user_choice`, null if not relevant), the participant's reasoning, timing data, and bot-detection data. See [here](DEPLOY.md#viewing-and-exporting-data) for queries and export, and [here](DEPLOY.md#bot-detection-review) for reviewing flagged submissions.

If you are creating your own study, prepare and host your data in a JSON file following the format laid out [here](https://github.com/Social-Futures-Lab/pitch/blob/master/data/README.md). Update the STUDY_DATA_URL environment variable accordingly (see [.env.example](/.env.example)).


## Citation

If you use this platform in your research, please cite:

```bibtex
@article{wang2026pitch,
  title   = {When Should AI Chime In? Benchmarking Timely Contribution
             of Proactive Agents in Multi-Party Chat},
  author  = {Wang, Ruotong and Yu, Brian S. and Zhou, Xinyi and
             Chang, Joseph Chee and Siangliulue, Pao and Bragg, Jonathan and
             Jiang, Liwei and Zhang, Amy X.},
  journal = {arXiv preprint},
  year    = {2026}
}
```


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## Contact

For questions, feedback, or collaboration inquiries, please feel free to reach out to [Ruotong Wang](http://ruotongw.com/) or [Brian Yu](mailto:gobrianyu@gmail.com).
