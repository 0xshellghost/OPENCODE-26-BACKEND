import { response } from 'express';
import prisma from '../config/db.config.js';
import { response_200, response_500 } from '../utils/responseCodes.js';

const registerUser = async (req, res) => {
    try {
        const userId = req.user.id;
        let userData = await prisma.user.findUnique({
            where: {
                githubId: userId
            }
        });

        if (!userData) {
            //first time user is authenticating, add him into db
            const {
                name,
                email,
                college,
                graduationYear,
                branch,
                degree,
                discordId,
                avatarUrl
            } = req.body;

            try {
                const newParticipant = await prisma.participant.create({
                    data: {
                        User: {
                            connectOrCreate: {
                                where: { githubId: userId },
                                create: {
                                    name: name,
                                    email: email, //from frontend form
                                    avatarUrl: avatarUrl,
                                    college: college,
                                    graduationYear: Number(graduationYear),
                                    branch: branch,
                                    degree: degree,
                                    discordId: discordId,
                                    githubId: userId
                                }
                            }
                        }
                    }
                });
                response_200(res, 'User created successfully', newParticipant);
            } catch (error) {
                console.log(error);
                response_500(res, 'Error while creating user', error);
            }
        } else {
            return res.send('User with that GitHub ID already exists.');
        }
    } catch (error) {
        console.error(error);
        return response_500(res, 'Error while fetching user', error);
    }
};

export default registerUser;
