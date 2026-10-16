import prisma from '../config/db.config.js';
import {
    response_200,
    response_400,
    response_404,
    response_500
} from '../utils/responseCodes.js';
import { headerChecker } from '../utils/helpers.js';


const getParticipant = async (req, res) => {
    try {
        const { participantId, eventName } = req.params;
        const flag = await headerChecker(req);
        const participant = await prisma.participant.findUnique({
            where: {
                participantId: participantId
            },
            select: {
                User: {
                    select: {
                        name: true,
                        githubId: true,
                        gender: true,
                        year: true,
                        avatarUrl: true,
                        ...(flag && {
                            email: true,
                            college: true,
                            discordId: true
                        })
                    }
                },
                PR: {
                    take: flag ? 5 : 0,
                    orderBy: { id: 'desc' },
                    ...(flag && {
                        select: {
                            prNumber: true,
                            status: true,
                            title: true,
                            issue: {
                                select: {
                                    issueNumber: true,
                                    currentPoints: true,
                                    repoName: true
                                }
                            }
                        }
                    })
                }

            }
        });

        if (!participant) {
            return response_404(res, 'Participant not found');
        }

        const leaderboard = await prisma.leaderboardEntry.findMany({
            //Major WorkAround, in future if multiple events are hosted than it Needs To be
            //used as 'participantId_eventName' as one participant can be in many Events
            //by doing this it will fetch unique participants, currently only one event and one unique participant in that. 
            where: {
                participantId: participantId
            },
        });

        const formattedData = {
            ...participant.User,
            PR: participant.PR,
            points: leaderboard[0]?.points ?? 0,
            prMerged: leaderboard[0]?.PRmerged ?? 0,
        };

        return response_200(res, 'OK', formattedData);
    } catch (error) {
        response_500(res, 'Error', error);
    }
};

const participantIssues = async (req, res) => {
    try {
        const { participantId, eventName } = req.params; //path parameter
        const repoName = req.query.repoName;
        const data = await prisma.event.findUnique({
            where: {
                name: eventName
            },
            select: {
                Repo: {
                    where: {
                        ...(repoName && { name: repoName })
                    },
                    select: {
                        name: true,
                        issues: {
                            where: {
                                assigneeId: participantId
                            },
                            select: {
                                issueNumber: true,
                                title: true,
                                status: true,
                                currentPoints: true
                            }
                        }
                    }
                }
            }
        });
        if (!data) {
            return response_404(res, 'No issues found for this user');
        }
        const formattedData = data.Repo.map((repo) => {
            return {
                repoName: repo.name,
                issues: repo.issues
            };
        });
        const finalData = {
            count: formattedData.reduce(
                (res, ele) => res + ele.issues.length,
                0
            ),
            data: formattedData
        };
        return response_200(res, 'Success', finalData);
    } catch (err) {
        console.log(err);
        response_500(res, 'Error while fetching issues in the event', err);
    }
};

const getPRdetails = async (req, res) => {
    try {
        const { githubId, eventName } = req.params;
        const user = await prisma.participant.findUnique({
            where: {
                participantId: githubId
            },
            include: {
                PR: {
                    where: {
                        issue: {
                            repo: {
                                eventName: eventName
                            }
                        }
                    },
                    select: {
                        title: true,
                        prNumber: true,
                        points: true,
                        status: true,
                        issue: {
                            select: {
                                repoName: true,
                                issueNumber: true
                            }
                        }
                    }
                }
            }
        });

        if (!user) {
            return response_404(res, 'User not found');
        }

        const pullRequests = user.PR.map((pr) => {
            return {
                prTitle: pr.title,
                prNumber: pr.prNumber,
                issueNumber: pr.issue.issueNumber,
                points: pr.points,
                status: pr.status,
                repoName: pr.issue.repoName
            };
        });

        return response_200(res, 'Success', pullRequests);
    } catch (err) {
        console.error(err);
        response_500(res, 'Error while fetching PR details', err);
    }
};

const getPRPoints = async (req, res) => {
    try {
        const { participantId } = req.params;
        const participant = await prisma.participant.findUnique({
            where: {
                participantId
            },
            select: {
                PR: {
                    select: {
                        points: true
                    }
                }
            }
        });

        if (!participant) {
            return response_404(res, 'User not found');
        }

        return response_200(
            res,
            'Success',
            participant.PR.reduce((total, { points }) => total + points, 0)
        );
    } catch (error) {
        console.error(error);
        response_500(res, 'Error while fetching PR points', error);
    }
};

const registerParticipantForEvent = async (req, res) => {
    try {
        const { eventName } = req.query;

        //upsert acts as findOrCreate
        const registerUser = await prisma.leaderboardEntry.upsert({
            where: {
                participantId_eventName: {
                    participantId: req.user.id,
                    eventName: eventName
                }
            },
            update: {},
            create: {
                Participant: {
                    connect: {
                        participantId: req.user.id
                    }
                },
                event: {
                    connect: {
                        name: eventName
                    }
                }
            },
            select: {
                eventName: true,
                participantId: true,
                points: true,
                PRmerged: true
            }
        });
        return response_200(
            res,
            `Successfully registered user for the event ${eventName}`,
            registerUser
        );
    } catch (err) {
        response_500(res, 'Error while registering user for the event', err);
    }
};

const loggedInParticipantDetails = async (req, res) => {
    try {
        const githubId = req.user.id;
        const eventName = req.query.eventName;
        const participant = await prisma.participant.findUnique({
            where: {
                participantId: githubId
            },
            select: {
                User: {
                    select: {
                        name: true,
                        email: true,
                        college: true,
                        avatarUrl: true,
                        githubId: true,
                        discordId: true,
                        gender: true,
                        year: true
                    }
                },
                LeaderboardEntries: {
                    where: {
                        eventName: eventName
                    },
                    select: {
                        points: true,
                        PRmerged: true
                    }
                },
                PR: {
                    take: 5,
                    select: {
                        prNumber: true,
                        status: true,
                        title: true,
                        issue: {
                            select: {
                                issueNumber: true,
                                currentPoints: true,
                                repoName: true
                            }
                        }
                    }
                }
            }
        });

        const formattedData = {
            ...participant.User,
            PR: participant.PR,
            points: participant.LeaderboardEntries?.[0]?.points ?? 0,
            prMerged: participant.LeaderboardEntries?.[0]?.PRmerged ?? 0,
            rank: participant.LeaderboardEntries?.[0] ? await prisma.leaderboardEntry.count({
                where: {
                    eventName: eventName,
                    points: {
                        gte: participant.LeaderboardEntries[0].points
                    }
                }
            }) : 'Unranked'
        };
        
        return response_200(res, 'OK', formattedData);
    } catch (error) {
        console.error(error);
        response_500(res, 'Error while getting participant info', error);
    }
};

const updateParticipantProfile = async (req, res) => {
    try {
        const githubId = req.user.id;
        const {
            name,
            college,
            discordId,
            gender,
            year,
            branch,
            degree,
            graduationYear,
            avatarUrl
        } = req.body;

        const user = await prisma.user.findUnique({
            where: { githubId }
        });

        if (!user) {
            return response_404(res, 'User not found');
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (college !== undefined) updateData.college = college;
        if (gender !== undefined) updateData.gender = gender;
        if (year !== undefined) updateData.year = String(year);
        if (branch !== undefined) updateData.branch = branch;
        if (degree !== undefined) updateData.degree = degree;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (graduationYear !== undefined && graduationYear !== null && graduationYear !== '') {
            updateData.graduationYear = Number(graduationYear);
        }

        if (discordId !== undefined) {
            const trimmedDiscord = typeof discordId === 'string' ? discordId.trim() : discordId;
            const finalDiscord = trimmedDiscord === '' ? null : trimmedDiscord;

            if (finalDiscord) {
                const existingUserWithDiscord = await prisma.user.findFirst({
                    where: {
                        discordId: finalDiscord,
                        NOT: { githubId }
                    }
                });
                if (existingUserWithDiscord) {
                    return response_400(res, 'Discord ID is already in use by another user');
                }
            }
            updateData.discordId = finalDiscord;
        }

        const updatedUser = await prisma.user.update({
            where: { githubId },
            data: updateData
        });

        return response_200(res, 'Profile updated successfully', updatedUser);
    } catch (error) {
        if (error.code === 'P2002') {
            const target = error.meta?.target;
            return response_400(res, `${target || 'Field'} is already in use`);
        }
        console.error(error);
        return response_500(res, 'Error while updating profile', error);
    }
};

export {
    participantIssues,
    getPRdetails,
    getPRPoints,
    getParticipant,
    registerParticipantForEvent,
    loggedInParticipantDetails,
    updateParticipantProfile
};
