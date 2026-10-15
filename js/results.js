/**
 * Results page module
 * Displays study results and allows users to continue or start fresh
 */

function init() {
    const studyData = JSON.parse(sessionStorage.getItem('studyResults') || '{}');

    if (!studyData.results || !studyData.stats) {
        window.location.href = 'index.html';
        return;
    }

    displayResults(studyData);
    setupEventListeners();
}

function displayResults(studyData) {
    const { stats, results } = studyData;

    document.getElementById('total-completed').textContent = stats.completed;
    document.getElementById('not-relevant').textContent = stats.notRelevant;

    const placedItems = stats.completed - stats.notRelevant;
    document.getElementById('best-turn').textContent =
        `${stats.inBestTurn} / ${placedItems}`;
    document.getElementById('in-window').textContent =
        `${stats.inWindow} / ${placedItems}`;

    const accuracy = placedItems > 0
        ? Math.round((stats.inWindow / placedItems) * 100) + '%'
        : 'N/A';
    document.getElementById('accuracy').textContent = accuracy;

    const jsonOutput = JSON.stringify(results, null, 2);
    document.getElementById('json-output').textContent = jsonOutput;
}

function setupEventListeners() {
    document.getElementById('btn-copy').addEventListener('click', copyToClipboard);
    document.getElementById('btn-continue').addEventListener('click', continueStudy);
    document.getElementById('btn-new-session').addEventListener('click', startNewSession);
}

async function copyToClipboard() {
    const jsonText = document.getElementById('json-output').textContent;

    try {
        await navigator.clipboard.writeText(jsonText);
        showCopyFeedback();
    } catch (err) {
        fallbackCopyToClipboard(jsonText);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        document.execCommand('copy');
        showCopyFeedback();
    } catch (err) {
        alert('Failed to copy. Please manually select and copy the text.');
    }

    document.body.removeChild(textArea);
}

function showCopyFeedback() {
    const feedback = document.getElementById('copy-feedback');
    feedback.classList.remove('hidden');

    setTimeout(() => {
        feedback.classList.add('hidden');
    }, 2000);
}

function continueStudy() {
    // Keep the current session data and return to the main study
    window.location.href = 'index.html';
}

function startNewSession() {
    // Clear all session data
    sessionStorage.clear();
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', init);
