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

        if (!userData) {
            try {
                const newParticipant = await prisma.participant.create({
                    data: {
                        User: {
                            connectOrCreate: {
                                where: { githubId: userId },
                                create: {
                                    name: name,
                                    email: email,
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
            try {
                const updatedUser = await prisma.user.update({
                    where: { githubId: userId },
                    data: {
                        name: name ?? userData.name,
                        email: email ?? userData.email,
                        avatarUrl: avatarUrl ?? userData.avatarUrl,
                        college: college ?? userData.college,
                        graduationYear: graduationYear ? Number(graduationYear) : userData.graduationYear,
                        year: year ?? userData.year,
                        gender: gender ?? userData.gender,
                        branch: branch ?? userData.branch,
                        degree: degree ?? userData.degree,
                        discordId: discordId ?? userData.discordId
                    }
                });

                await prisma.participant.upsert({
                    where: { participantId: userId },
                    update: {},
                    create: {
                        participantId: userId,
                        User: { connect: { githubId: userId } }
                    }
                });

                response_200(res, 'User updated successfully', updatedUser);
            } catch (error) {
                console.log(error);
                response_500(res, 'Error while updating user', error);
            }
        }
    } catch (error) {
        console.error(error);
        return response_500(res, 'Error while fetching user', error);
    }
};

export default registerUser;
