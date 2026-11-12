import prisma from '../config/db.config.js';
import {
    response_200,
    response_400,
    response_409,
    response_500
} from '../utils/responseCodes.js';
import { validateRegistration } from '../utils/registrationValidation.js';

const getConflictingField = (error) => {
    const target = Array.isArray(error?.meta?.target)
        ? error.meta.target.join(' ')
        : String(error?.meta?.target || '');
    return target.toLowerCase().includes('email') ? 'email' : 'discordId';
};

const registerUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const validation = validateRegistration(req.body);
        if (!validation.isValid) {
            return response_400(
                res,
                'Please correct the highlighted registration fields.',
                validation.errors
            );
        }

        const {
            name,
            email,
            college,
            graduationYear,
            year,
            branch,
            degree,
            discordId,
            gender
        } = validation.data;
        const avatarUrl = `https://github.com/${encodeURIComponent(userId)}.png`;

        let userData = await prisma.user.findUnique({
            where: {
                githubId: userId
            }
        });

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
                                    graduationYear,
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
                return response_200(res, 'User created successfully', newParticipant);
            } catch (error) {
                if (error?.code === 'P2002') {
                    const field = getConflictingField(error);
                    return response_409(res, {
                        [field]: `That ${field === 'email' ? 'email address' : 'Discord username'} is already registered.`
                    });
                }
                console.error('Registration create failed:', error);
                return response_500(res, 'Error while creating user');
            }
        } else {
            try {
                const updatedUser = await prisma.user.update({
                    where: { githubId: userId },
                    data: {
                        name,
                        email,
                        avatarUrl,
                        college,
                        graduationYear,
                        year,
                        gender,
                        branch,
                        degree,
                        discordId
                    }
                });

                await prisma.participant.upsert({
                    where: { participantId: userId },
                    update: {},
                    create: {
                        User: { connect: { githubId: userId } }
                    }
                });

                return response_200(res, 'User updated successfully', updatedUser);
            } catch (error) {
                if (error?.code === 'P2002') {
                    const field = getConflictingField(error);
                    return response_409(res, {
                        [field]: `That ${field === 'email' ? 'email address' : 'Discord username'} is already registered.`
                    });
                }
                console.error('Registration update failed:', error);
                return response_500(res, 'Error while updating user');
            }
        }
    } catch (error) {
        console.error(error);
        return response_500(res, 'Error while fetching user');
    }
};

export default registerUser;
