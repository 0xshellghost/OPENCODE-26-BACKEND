import axios from 'axios';
export async function commentOnAPullRequest(repoName, PRNumber, comment) {
    try {
        const response = await axios.post(
            `https://api.github.com/repos/geekhaven-test/${repoName}/issues/${PRNumber}/comments`,
            {
                body: comment
            },
            {
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: process.env.GITHUB_TOKEN_BOT
                }
            }
        );
        console.log(response.status,response.data);
    } catch (error) {
        console.log(error);
    }
}