import prisma from '../config/db.config.js';
import {
    response_200,
    response_404,
    response_500
} from '../utils/responseCodes.js';
import { headerChecker } from '../utils/helpers.js';

const getParticipant = async (req, res) => {
    try {
        const { participantId } = req.params;
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
                    ...(flag && {
                        select: {
                            prNumber: true,
                            status: true,
                            title: true,
                            issue: {
                                select: {
                                    issueNumber: true,
                                    currentPoints: true
                                }
                            }
                        }
                    })
                }

            }
        });
        // // gadekar sir special request
        const formattedData = {
            ...participant.User,
            PR: participant.PR
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
                        discordId: true
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

export {
    participantIssues,
    getPRdetails,
    getParticipant,
    registerParticipantForEvent,
    loggedInParticipantDetails
};
