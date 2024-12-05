const axios = require('axios');

/**
 * Posts a comment on a GitHub pull request or issue.
 * @param {string} repoOwner - The owner of the repository.
 * @param {string} repoName - The name of the repository.
 * @param {number} issueOrPRNumber - The issue or pull request number.
 * @param {string} comment - The comment body to post.
 */
async function commentOnAnIssue(repoOwner, repoName, issueOrPRNumber, comment) {
    try {
        const response = await axios.post(
            `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueOrPRNumber}/comments`,
            { body: comment },
            {
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `Bearer ${process.env.GITHUB_TOKEN_BOT}`, // Add `Bearer` prefix
                },
            }
        );
        console.log('Comment posted successfully:', response.data);
        return response.data; // Returning data for potential use
    } catch (error) {
        console.error('Error posting comment:', error.message);
        throw error;
    }
}

module.exports = commentOnAnIssue;
