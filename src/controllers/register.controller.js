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
                year,
                branch,
                degree,
                discordId,
                avatarUrl,
                gender
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
                                    year: year,
                                    gender: gender,
                                    branch: branch,
                                    degree: degree,
                                    discordId: discordId,
                                    githubId: userId
                                }
                            }
                        }
                    }
                });
                console.log('New user created:', newParticipant);
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
