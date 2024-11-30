import prisma from '../config/db.config.js';
import { response_500, response_200 } from '../utils/responseCodes.js';
import Fuse from 'fuse.js';

const getAllEvents = async (req, res) => {
    try {
        const events = await prisma.event.findMany({
            where: {
                deletedAt: null
            },
            select: {
                name: true,
                logoImageURL: true,
                description: true,
                startDate: true,
                endDate: true,
                deletedAt: true
            }
        });

        return response_200(res, 'OK', events);
    } catch (error) {
        response_500(res, 'Error', error);
    }
};

const getEvent = async (req, res) => {
    try {
        let event = await prisma.event.findUnique({
            where: {
                name: req.params.eventName
            },
            select: {
                name: true,
                logoImageURL: true,
                description: true,
                startDate: true,
                endDate: true,
                coverImagesURL: {
                    select: {
                        url: true
                    }
                },
                _count: {
                    select: {
                        LeaderBoardEntries: true,
                        Repo: true
                    }
                }
            }
        });
        const formattedData = await (async () => {
            event.numberOfParticipants = event._count.LeaderBoardEntries;
            event.numberOfRepos = event._count.Repo;
            delete event._count;
            return event;
        })(event);
        return response_200(res, 'OK', formattedData);
    } catch (error) {
        response_500(res, 'Error', error);
    }
};

const getAllReposOfEvent = async (req, res) => {
    try {
        const AllReposOfEvent = await prisma.repo.findMany({
            where: {
                eventName: req.params.eventName
            },
            select: {
                name: true,
                description: true
            }
        });

        return response_200(res, 'OK', AllReposOfEvent);
    } catch (error) {
        response_500(res, 'Error', error);
    }
};

const getRepoOfEvent = async (req, res) => {
    try {
        const RepoOfEvent = await prisma.repo.findUnique({
            where: {
                name: req.params.repoName
            },
            select: {
                name: true,
                description: true,
                eventName: true,
                issues: {
                    take: 5,
                    select: {
                        title: true,
                        status: true,
                        currentPoints: true,
                        issueNumber: true,
                        openForAll: true,
                        assigneeId: true
                    }
                }
            }
        });
        return response_200(res, 'OK', RepoOfEvent);
    } catch (error) {
        response_500(res, 'Error', error);
    }
};

const getLeaderboard = async (req, res) => {
    try {
        //This gets all the leaderboardEntries of the event
        const leaderboardOfEvent = await prisma.leaderboardEntry.findMany({
            where: {
                eventName: req.params.eventName
            },
            include: {
                Participant: {
                    select: {
                        User: {
                            select: {
                                name: true,
                                githubId: true,
                                avatarUrl: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                points: 'desc'
            }
        });

        // Algorithm to get rank for each participant
        let prevPosition = 0;
        const formattedLeaderboard = leaderboardOfEvent.map((entry) => {
            let position = prevPosition + 1;
            if (
                prevPosition > 0 &&
                entry.points === leaderboardOfEvent[prevPosition - 1].points
            ) {
                position = prevPosition;
            } else {
                prevPosition = position;
            }
            return {
                position: position,
                name: entry.Participant.User.name,
                githubid: entry.Participant.User.githubId,
                prmerged: entry.PRmerged,
                points: entry.points,
                avatarUrl: entry.Participant.User.avatarUrl
                // prDetailsURL: `${process.env.BACKEND_URL}/api/v1/participant/${entry.Participant.User.githubId}/${req.params.eventName}/pr`
            };
        });
        return response_200(res,'OK',formattedLeaderboard);
    } catch (error) {
        response_500(res, 'Error', error);
    }
};

//Updating leaderboard will be done in GitHub bot.

export {
    getAllEvents,
    getEvent,
    getAllReposOfEvent,
    getRepoOfEvent,
    getLeaderboard
};
