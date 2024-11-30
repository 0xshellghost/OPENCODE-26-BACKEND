import axios from 'axios';

export async function getRepoDetails(repoManagerName, repoName) {
    try {
        const opts = { headers: { Authorization: process.env.GITHUB_TOKEN } };
        //change it back to production
        //bache hue
        const userRepo = await axios.get(
            `https://api.github.com/repos/geekhaven-test/${repoName}`,
            opts
        );
        return userRepo.data;
    } catch (error) {
        console.log(error);
        return null;
    }
}
