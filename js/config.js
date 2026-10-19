/**
 * Configuration module
 * Contains application settings
 */

export const config = {
    // API base URL
    // Empty string for same domain (Vercel deployment)
    // Set to full URL for local development (e.g., 'http://localhost:3000')
    apiBaseUrl: '',

    // Prolific completion
    prolificCompletionUrl: 'your-study-completion-redirect-url',
    redirectDelayMs: 3000 // 3 seconds
};
