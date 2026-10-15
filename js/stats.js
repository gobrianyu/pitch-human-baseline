/**
 * Statistics tracking module
 * Manages and displays user performance statistics
 */

const stats = {
    completed: 0,
    inBestTurn: 0,
    inWindow: 0,
    notRelevant: 0
};

export function updateStats(result) {
    stats.completed++;

    if (result.notRelevant) {
        stats.notRelevant++;
    } else {
        if (result.inBestTurn) stats.inBestTurn++;
        if (result.inWindow) stats.inWindow++;
    }

    displayStats();
}

export function displayStats() {
    document.getElementById('completed-count').textContent = stats.completed;
    document.getElementById('not-relevant-count').textContent = stats.notRelevant;
    document.getElementById('best-turn-count').textContent = stats.inBestTurn;
    document.getElementById('window-count').textContent = stats.inWindow;

    const placedItems = stats.completed - stats.notRelevant;
    const accuracy = placedItems > 0
        ? Math.round((stats.inWindow / placedItems) * 100) + '%'
        : '-';
    document.getElementById('accuracy').textContent = accuracy;
}

export function getStats() {
    return { ...stats };
}

export function recalculateStats(results) {
    stats.completed = results.length;
    stats.inBestTurn = results.filter(r => r.in_best_turn).length;
    stats.inWindow = results.filter(r => r.in_window).length;
    stats.notRelevant = results.filter(r => r.not_relevant).length;

    displayStats();
}
