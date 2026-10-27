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
                deletedAt: true,
                isFlagship: true,
                coverImagesURL: {
                    select: {
                        url: true
                    }
                }
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
                isFlagship: true,
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

const parseJsonArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : [];
    }
};

const formatRepo = (repo) => {
    if (!repo) return null;
    const tags = parseJsonArray(repo.tags);
    const mentors = parseJsonArray(repo.mentors);
    return {
        ...repo,
        tags,
        mentors,
        maintainers: mentors.map(name => ({ name }))
    };
};

const getAllReposOfEvent = async (req, res) => {
    try {
        const repos = await prisma.repo.findMany({
            where: {
                eventName: req.params.eventName
            },
            select: {
                id: true,
                name: true,
                description: true,
                tags: true,
                language: true,
                mentors: true,
                isFirstYrOnly: true,
                isGirlsOnly: true
            }
        });

        return response_200(res, 'OK', repos.map(formatRepo));
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
                id: true,
                name: true,
                description: true,
                tags: true,
                language: true,
                mentors: true,
                isFirstYrOnly: true,
                isGirlsOnly: true,
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

        if (!RepoOfEvent) {
            return response_404(res, 'Repo not found');
        }

        return response_200(res, 'OK', formatRepo(RepoOfEvent));
    } catch (error) {
        response_500(res, 'Error', error);
    }
};

const getLeaderboard = async (req, res) => {
    try {
        const { eventName } = req.params;
        const isOpencode = (eventName || '').toLowerCase().includes('opencode');

        // Fetch all leaderboard entries of the requested event
        const leaderboardOfEvent = await prisma.leaderboardEntry.findMany({
            where: {
                eventName: eventName
            },
            include: {
                Participant: {
                    select: {
                        User: {
                            select: {
                                name: true,
                                githubId: true,
                                avatarUrl: true,
                                college: true,
                                graduationYear: true,
                                isMentor: true,
                                isAdmin: true,
                                createdAt: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { points: 'desc' },
                { Participant: { User: { createdAt: 'asc' } } },
                { participantId: 'asc' }
            ]
        });

        if (!leaderboardOfEvent || leaderboardOfEvent.length === 0) {
            return response_200(res, 'OK', []);
        }

        // Determine if this event tracks points or is only rank & name.
        // OpenCode always has points and PR counts.
        // Other events only include points if points are actively tracked,
        // or if specified via query param.
        const explicitNoPoints = req.query.hasPoints === 'false' || req.query.type === 'rank_only';
        const hasRecordedPoints = leaderboardOfEvent.some(
            (entry) => entry.points !== null && entry.points !== undefined && Number(entry.points) > 0
        ) && !leaderboardOfEvent.every(
            (entry, index) => Number(entry.points) === index + 1
        );
        const hasPoints = isOpencode || (req.query.hasPoints === 'true' || (!explicitNoPoints && hasRecordedPoints));

        let lastRank = null;
        let rankCounter = 0;

        const formattedLeaderboard = leaderboardOfEvent.map((entry, index) => {
            const user = entry.Participant?.User;
            const createdAtTime = user?.createdAt ? new Date(user.createdAt).getTime() : 0;
            const githubId = user?.githubId || entry.participantId;
            const name = user?.name || githubId;
            const avatarUrl = user?.avatarUrl || (githubId ? `https://avatars.githubusercontent.com/${githubId}` : null);
            const collegeName = user?.college || 'N/A';
            const graduationYear = user?.graduationYear || '';
            const isMentor = Boolean(user?.isMentor || user?.isAdmin);

            // 1. OpenCode: contains Rank, Name, github Id, PRs Merged, and Points
            if (isOpencode) {
                const rank = [entry.points ?? 0, createdAtTime];
                if (lastRank === null || rank.some((value, idx) => value !== lastRank[idx])) {
                    rankCounter += 1;
                    lastRank = rank;
                }
                return {
                    position: rankCounter,
                    name,
                    githubid: githubId,
                    prmerged: entry.PRmerged ?? 0,
                    points: entry.points ?? 0,
                    avatarUrl,
                    collegeName,
                    graduationYear,
                    isMentor
                };
            }

            // 2. Other events with points: contain Rank, Name, and Points
            if (hasPoints) {
                const rank = [entry.points ?? 0, createdAtTime];
                if (lastRank === null || rank.some((value, idx) => value !== lastRank[idx])) {
                    rankCounter += 1;
                    lastRank = rank;
                }
                return {
                    position: rankCounter,
                    name,
                    points: entry.points ?? 0,
                    avatarUrl,
                    collegeName,
                    graduationYear
                };
            }

            // 3. Events with only Name and Rank
            return {
                position: index + 1,
                name,
                avatarUrl,
                collegeName,
                graduationYear
            };
        });

        return response_200(res, 'OK', formattedLeaderboard);
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
