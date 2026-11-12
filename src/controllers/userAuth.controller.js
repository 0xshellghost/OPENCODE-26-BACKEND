import axios from 'axios';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { response_401, response_500 } from '../utils/responseCodes.js';
import dotenv from 'dotenv';
import prisma from '../config/db.config.js';

dotenv.config();

// axios buggy with proxy. needs repair.
axios.defaults.proxy = false;

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax'
};

const setCookie = (res, token) => {
    res.cookie('jwt', token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

const createSessionToken = (githubId, isAdmin, avatarUrl) =>
    jwt.sign(
        {
            id: githubId,
            githubId,
            avatarUrl: avatarUrl || '',
            roles: { isAdmin }
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

// Display the auth screen where user logs in to GitHub
const userGitHubRedirect = async (req, res) => {
    const state = crypto.randomBytes(32).toString('hex');
    res.cookie('oauth_state', state, {
        ...cookieOptions,
        maxAge: 10 * 60 * 1000
    });
    const params = new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        state,
        scope: 'read:user user:email'
    });
    const userAuthScreenURL = `https://github.com/login/oauth/authorize?${params.toString()}`;
    return res.redirect(userAuthScreenURL);
};

// Once user is logged in, exchange AUTH_CODE for ACCESS_TOKEN
const userTokenTransfer = async (req, res) => {
    const AUTH_CODE = req.query.code;
    const STATE = req.query.state;
    const expectedState = req.cookies?.oauth_state;
    res.clearCookie('oauth_state', cookieOptions);

    // The state is generated per login attempt and stored in an HttpOnly cookie.
    if (!STATE || !expectedState || STATE !== expectedState) {
        return response_401(res, 'Unable to authorize you: Invalid state parameter');
    }

    if (!AUTH_CODE) {
        return response_401(res, 'Authorization code missing');
    }

    const params = {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code: AUTH_CODE
    };

    const opts = { headers: { accept: 'application/json' } };

    try {
        // 2. Exchange code for access_token
        const tokenResponse = await axios.post(
            'https://github.com/login/oauth/access_token',
            params,
            opts
        );

        const accessToken = tokenResponse.data?.access_token;
        if (!accessToken) {
            console.error('GitHub OAuth Error:', tokenResponse.data);
            return response_401(
                res,
                tokenResponse.data?.error_description || 'Failed to obtain access token from GitHub'
            );
        }

        // 3. Fetch user details from GitHub
        const userGitHub = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        const userGitHubData = userGitHub.data;

        // 4. Check user in database
        try {
            const userData = await prisma.user.findUnique({
                where: {
                    githubId: userGitHubData.login
                }
            });

            // Case A: User not registered yet
            if (!userData) {
                const token = createSessionToken(
                    userGitHubData.login,
                    false,
                    userGitHubData.avatar_url
                );
                setCookie(res, token);
                return res.redirect(
                    `${process.env.SUCCESS_REDIRECT_URL}?token=${token}&avatar_url=${encodeURIComponent(
                        userGitHubData.avatar_url || ''
                    )}`
                );
            }

            // Case B: User is an Admin
            if (userData.isAdmin) {
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
                                        Event: { create: [] },
                                        Repo: { create: [] }
                                    }
                                }
                            }
                        }
                    });
                }

                const token = createSessionToken(
                    userData.githubId,
                    true,
                    userData.avatarUrl
                );
                setCookie(res, token);
                return res.redirect(
                    `${process.env.ADMIN_DASHBOARD_URL}?token=${token}&avatar_url=${encodeURIComponent(
                        userData.avatarUrl || ''
                    )}`
                );
            }

            // Case C: Regular User
            const token = createSessionToken(
                userData.githubId,
                false,
                userData.avatarUrl
            );
            setCookie(res, token);
            return res.redirect(
                `${process.env.USER_DASHBOARD_URL}?token=${token}&avatar_url=${encodeURIComponent(
                    userData.avatarUrl || ''
                )}`
            );
        } catch (dbError) {
            console.error('Error while fetching user from db:', dbError);
            return response_500(res, 'Error while fetching user from db', dbError);
        }
    } catch (authError) {
        console.error('Error during GitHub OAuth token exchange:', authError);
        return response_500(res, 'Error while fetching token', authError);
    }
};

export { userGitHubRedirect, userTokenTransfer };
