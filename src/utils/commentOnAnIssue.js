import axios from "axios";
export async function commentOnAnIssue( repoName, issueNumber, comment) {
    try {
        const response = await axios.post(
            `https://api.github.com/repos/${process.env.ORG_NAME}/${repoName}/issues/${issueNumber}/comments`,
            { 
                body: comment 
            },
            {
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization:`Bearer ${process.env.GITHUB_TOKEN_BOT}`,
                },
            }
        );
        console.log('Comment posted successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error posting comment:', error.message);
        throw error;
    }
}

export async function fetchCommentsFromGitHub( repoName, issueNumber) {
    try {
        const response = await axios.get(
            `https://api.github.com/repos/${process.env.ORG_NAME}/${repoName}/issues/${issueNumber}/comments`,
            {
                headers: {
                    Accept: 'application/vnd.github+json',
                        Authorization: `Bearer ${process.env.GITHUB_TOKEN_BOT}`,
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching comments from GitHub:', error.message);
        throw error;
    }
}

