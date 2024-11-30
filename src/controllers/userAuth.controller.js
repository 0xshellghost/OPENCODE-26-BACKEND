import axios from 'axios';
import jwt from 'jsonwebtoken';
import { response_200, response_401 } from '../utils/responseCodes.js';
import dotenv from 'dotenv';
import prisma from '../config/db.config.js';
import { response_500 } from '../utils/responseCodes.js';

dotenv.config();

//axios buggy with proxy. needs repair.
axios.defaults.proxy = false;

//display the auth screen where user logs in to github
const userGitHubRedirect = async (req, res) => {
    const userAuthScreenURL = `https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}&state=${process.env.STATE}&scope=read:user`;
    res.redirect(userAuthScreenURL);
};

//once user is logged in, exchange AUTH_CODE for ACCESS_TOKEN, and send it in the body of the response.
//the JWT Token can be fetched from /api/v1/auth/github/callback?code=${authCode}.
//this JWT token is then stored in client-side cookie, and included in Auth Header.
const userTokenTransfer = async (req, res) => {
    const AUTH_CODE = req.query.code;
    const STATE = req.query.state;
    //check if state altered by third party.
    if (STATE !== process.env.STATE) {
        response_401(res, 'Unable to authorize you');
    }

    const params = {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code: AUTH_CODE
    };

    let opts = { headers: { accept: 'application/json' } };

    //get access token and redirect user to logged in page.
    try {
        const response = await axios.post(
            'https://github.com/login/oauth/access_token',
            params,
            opts
        );
        const accessToken = response.data.access_token;

        //create a JWT token for the user once logged in through github.
        //get access to user data using access_token
        opts = { headers: { Authorization: 'Bearer ' + accessToken } };
        const userGitHub = await axios.get('https://api.github.com/user', opts);
        const userGitHubData = userGitHub.data;
        try {
            const userData = await prisma.user.findUnique({
                where: {
                    githubId: userGitHubData.login
                }
            });
            if (!userData) {
                const token = jwt.sign(
                    {
                        id: userGitHubData.login,
                        roles: {
                            isAdmin: false
                        }
                    },
                    process.env.JWT_SECRET
                );
                res.redirect(
                    // if user not registered, send to register route with token.
                    // token stored in localStorage here.
                    `${
                        process.env.SUCCESS_REDIRECT_URL
                    }?token=${token}&avatar_url=${encodeURIComponent(
                        userGitHubData.avatar_url
                    )}`
                );
            } else {
                if (userData.isAdmin) {
                    //check if user is admin
                    const checkAdmin = await prisma.admin.findUnique({
                        where: {
                            userId: userData.githubId
                        }
                    });
                    if (!checkAdmin) {
                        await prisma.user.update({
                            where: {
                                githubId: userData.githubId
                            },
                            data: {
                                Admin: {
                                    connectOrCreate: {
                                        where: {
                                            userId: userData.githubId
                                        },
                                        create: {
                                            Event: {
                                                create: []
                                            },
                                            Repo: {
                                                create: []
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                    const token = jwt.sign(
                        {
                            id: userData.githubId,
                            roles: {
                                isAdmin: true
                            }
                        },
                        process.env.JWT_SECRET
                    );
                    res.redirect(
                        `${
                            process.env.ADMIN_DASHBOARD_URL
                        }?token=${token}&avatar_url=${encodeURIComponent(
                            userData.avatarUrl
                        )}`
                    );
                } else {
                    const token = jwt.sign(
                        {
                            id: userData.githubId,
                            roles: {
                                isAdmin: false
                            }
                        },
                        process.env.JWT_SECRET
                    );
                    res.redirect(
                        `${
                            process.env.USER_DASHBOARD_URL
                        }?token=${token}&avatar_url=${encodeURIComponent(userData.avatarUrl)}`
                    );
                }
            }
        } catch (error) {
            console.error(error);
            response_500(res, 'Error while fetching user from db', error);
        }
    } catch (error) {
        console.error(error);
        response_500(res, 'Error while fetching token', error);
    }
};

export { userGitHubRedirect, userTokenTransfer };
