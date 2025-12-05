import axios from 'axios';

export async function getRepoDetails(repoManagerName, repoName) {
    try {
        const opts = { headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN_BOT}` } };
        //change it back to production
        //bache hue
        const userRepo = await axios.get(
            `https://api.github.com/repos/${process.env.ORG_NAME}/${repoName}`,
            opts
        );
        return userRepo.data;
    } catch (error) {
        console.log(error);
        return null;
    }
}
