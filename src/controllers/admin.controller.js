import mysql from 'mysql2/promise';
// import { PRStatus } from '@prisma/client';
import prisma from '../config/db.config.js';
import { getRepoDetails } from '../utils/getRepoDetails.js';
import {
    response_400,
    response_404,
    response_500,
    response_201,
    response_403,
    response_204,
    response_200
} from '../utils/responseCodes.js';
import cloudinary from '../config/cloudinary.config.js';
import { getDataURI } from '../utils/dataURIparser.js';

const createEvent = async (req, res) => {
    try {
        // read form fields from body and uploaded files from multer (req.files)
        const { title, description, startDate, endDate } = req.body;
        const logoFiles = req.files?.logoImage || [];
        const coverFiles = req.files?.coverImages || [];

        // validation -> return immediately after sending response
        if (!title || !description) {
            return response_400(
                res,
                'Title, description are required to create an event'
            );
        }

        // require logo file
        if (!logoFiles.length) {
            return response_400(
                res,
                'Logo image is required to create an event'
            );
        }

        const userId = req.user.id;
        const admin = await prisma.admin.findUnique({
            where: {
                userId: userId //LHS = userId (numbers), RHS = userId (string (username))
            }
        });

        if (admin) {
            const logoImageCloudinary = (await getDataURI(logoFiles[0]))
                .content;
            const imageUpload = await cloudinary.uploader.upload(
                logoImageCloudinary,
                {
                    resource_type: 'image',
                    folder: 'event',
                    format: 'png',
                    allowed_formats: ['png', 'jpg', 'jpeg'],
                    overwrite: true,
                    public_id: `eventImage-${title}`
                }
            );

            // guard coverFiles to avoid calling .map on undefined
            const coverImagesArray = Array.isArray(coverFiles)
                ? coverFiles
                : [];
            const coverImageLinks = await Promise.all(
                coverImagesArray.map(async (coverFile, idx) => {
                    const coverImageCloudinary = (await getDataURI(coverFile))
                        .content;
                    const imageUpload = await cloudinary.uploader.upload(
                        coverImageCloudinary,
                        {
                            resource_type: 'image',
                            folder: 'event',
                            format: 'png',
                            allowed_formats: ['png', 'jpg', 'jpeg'],
                            overwrite: true,
                            public_id: `coverImage-${title}-${idx + 1}`
                        }
                    );
                    return imageUpload.secure_url;
                })
            );
            const data = await prisma.event.create({
                data: {
                    name: title,
                    description: description,
                    creator: {
                        connect: {
                            userId: admin.userId
                        }
                    },
                    startDate: startDate,
                    endDate: endDate,
                    logoImageURL: imageUpload.secure_url,
                    coverImagesURL: coverImageLinks.length
                        ? {
                              createMany: {
                                  data: coverImageLinks.map((coverImage) => {
                                      return {
                                          url: coverImage
                                      };
                                  })
                              }
                          }
                        : undefined
                },
                select: {
                    coverImagesURL: true,
                    logoImageURL: true,
                    name: true,
                    description: true,
                    startDate: true,
                    endDate: true
                }
            });

            return response_201(res, 'Event created successfully', data);
        } else {
            return response_403(res, 'Only admins can create events');
        }
    } catch (error) {
        return response_500(res, 'Error while creating event', error);
    }
};

const deleteEvent = async (req, res) => {
    try {
        const { eventName } = req.params;
        const userId = req.user.id;
        const admin = await prisma.admin.findUnique({
            where: {
                userId: userId //LHS = userId (numbers), RHS = userId (string (username))
            }
        });
        if (!admin) {
            console.log('Error form Here');
            return response_403(res, 'Only admins can delete events');
        }
        if (!eventName) {
            return response_400(res, 'Event id is required to delete an event');
        }

        // delete event means just update deletedAt field in event table
        // to current timestamp and never query for events with deletedAt
        // field not null
        await prisma.event.update({
            where: {
                name: eventName
            },
            data: {
                deletedAt: new Date()
            }
        });

        return response_204(res, 'Event deleted successfully');
    } catch (error) {
        return response_500(res, 'Error while deleting event', error);
    }
};

const getEvents = async (req, res) => {
    try {
        const userId = req.user.id;

        console.log('User ID in getEvents:', userId);
        const admin = await prisma.admin.findUnique({
            where: {
                userId: userId
            },
            include: {
                Event: true
            }
        });
        const events = admin.Event?.filter((event) => !event.deletedAt);

        console.log(events);

        response_200(res, 'Events fetched successfully', events);
    } catch (error) {
        response_500(res, 'Error while fetching events', error);
    }
};

const addAdmin = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { userId } = req.params;

        if (!userId) {
            response_400(res, 'User id is required to add an admin');
        }
        const checkAdmin = await prisma.admin.findUnique({
            where: {
                userId: adminId
            }
        });
        if (!checkAdmin) {
            response_403(res, 'Only admins can add other admins');
        }
        const updateUser = await prisma.user.update({
            where: {
                githubId: userId
            },
            data: {
                isAdmin: true,
                Admin: {
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
        });
        response_201(res, 'User added as admin successfully', updateUser);
    } catch (error) {
        response_500(res, 'Error while adding admin', error);
    }
};

const getAllMentors = async (req, res) => {
    try {
        const mentors = await prisma.user.findMany({
            where: {
                OR: [
                    { isMentor: true },
                    { isAdmin: true }
                ],
                deletedAt: null
            },
            select: {
                id: true,
                githubId: true,
                name: true,
                avatarUrl: true,
                isAdmin: true,
                isMentor: true
            },
            orderBy: {
                githubId: 'asc'
            }
        });
        return response_200(res, 'OK', mentors);
    } catch (error) {
        return response_500(res, 'Error while fetching mentors', error);
    }
};

const addMentorRole = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { userId } = req.params;

        if (!userId) {
            return response_400(res, 'GitHub ID is required to assign mentor role');
        }

        const checkAdmin = await prisma.admin.findUnique({
            where: {
                userId: adminId
            }
        });
        if (!checkAdmin) {
            return response_403(res, 'Only admins can assign mentor roles');
        }

        const cleanHandle = userId.trim().replace(/^@/, '');

        const existingUser = await prisma.user.findFirst({
            where: {
                githubId: cleanHandle
            }
        });

        let updatedUser;
        if (existingUser) {
            updatedUser = await prisma.user.update({
                where: {
                    id: existingUser.id
                },
                data: {
                    isMentor: true
                }
            });
        } else {
            updatedUser = await prisma.user.create({
                data: {
                    githubId: cleanHandle,
                    name: cleanHandle,
                    email: `${cleanHandle.toLowerCase()}@users.noreply.github.com`,
                    avatarUrl: `https://avatars.githubusercontent.com/${cleanHandle}`,
                    college: 'IIIT Allahabad',
                    graduationYear: 2026,
                    branch: 'IT',
                    degree: 'B.Tech',
                    year: '3rd',
                    isMentor: true
                }
            });
        }

        return response_200(res, `User @${cleanHandle} promoted to Mentor successfully`, updatedUser);
    } catch (error) {
        return response_500(res, 'Error while adding mentor', error);
    }
};

const removeMentorRole = async (req, res) => {
    try {
        const adminId = req.user.id;
        const { userId } = req.params;

        if (!userId) {
            return response_400(res, 'GitHub ID is required to remove mentor role');
        }

        const checkAdmin = await prisma.admin.findUnique({
            where: {
                userId: adminId
            }
        });
        if (!checkAdmin) {
            return response_403(res, 'Only admins can remove mentor roles');
        }

        const cleanHandle = userId.trim().replace(/^@/, '');
        const existingUser = await prisma.user.findFirst({
            where: {
                githubId: cleanHandle
            }
        });

        if (!existingUser) {
            return response_404(res, `User @${cleanHandle} not found`);
        }

        const updatedUser = await prisma.user.update({
            where: {
                id: existingUser.id
            },
            data: {
                isMentor: false
            }
        });

        return response_200(res, `Mentor role removed for @${cleanHandle}`, updatedUser);
    } catch (error) {
        return response_500(res, 'Error while removing mentor', error);
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

function buildRepoTags({ repoName, repoDetails, customTags, isFirstYrOnly }) {
    const tagSet = new Set();

    // 1. Admin-specified tags
    if (Array.isArray(customTags)) {
        customTags.forEach(t => t && tagSet.add(String(t).trim()));
    } else if (typeof customTags === 'string' && customTags.trim()) {
        customTags.split(',').forEach(t => t && tagSet.add(t.trim()));
    }

    // 2. GitHub topics if returned by GitHub API
    if (repoDetails?.topics && Array.isArray(repoDetails.topics)) {
        repoDetails.topics.forEach(topic => {
            if (topic) tagSet.add(String(topic).trim());
        });
    }

    // 3. Domain inference from repo name, description, language, and topics
    const combined = `${repoName} ${repoDetails?.description || ''} ${Array.from(tagSet).join(' ')} ${repoDetails?.language || ''}`.toLowerCase();

    if (isFirstYrOnly || combined.includes('fresh') || combined.includes('beginner')) {
        tagSet.add('Freshers only');
    }
    if (combined.includes('ui') || combined.includes('ux') || combined.includes('design') || combined.includes('figma')) {
        tagSet.add('UI-UX');
    }
    if (combined.includes('ai') || combined.includes('ml') || combined.includes('vision') || combined.includes('nlp') || combined.includes('model') || combined.includes('learning')) {
        tagSet.add('AI-ML');
    }
    if (combined.includes('blockchain') || combined.includes('web3') || combined.includes('crypto') || combined.includes('solidity') || combined.includes('contract')) {
        tagSet.add('Blockchain');
    }
    if (combined.includes('game') || combined.includes('canvas') || combined.includes('arcade') || combined.includes('quest') || combined.includes('physics') || combined.includes('unity') || combined.includes('godot')) {
        tagSet.add('GameDev');
    }
    if (combined.includes('app') || combined.includes('flutter') || combined.includes('android') || combined.includes('ios') || combined.includes('dart') || combined.includes('react native')) {
        tagSet.add('AppDev');
    }
    if (combined.includes('cp') || combined.includes('competitive') || combined.includes('dsa') || combined.includes('algorithm') || combined.includes('leetcode')) {
        tagSet.add('Competitive Programming');
    }
    if (combined.includes('git') || combined.includes('vcs') || combined.includes('bash')) {
        tagSet.add('GitBasics');
    }
    if (combined.includes('security') || combined.includes('hack') || combined.includes('ctf') || combined.includes('exploit')) {
        tagSet.add('Cybersecurity');
    }

    const standardDomains = [
        'WebD', 'AppDev', 'UI-UX', 'AI-ML', 'Blockchain', 'GameDev',
        'Competitive Programming', 'GitBasics', 'Freshers only', 'Cybersecurity'
    ];
    const hasDomain = standardDomains.some(d => tagSet.has(d));
    if (!hasDomain) {
        tagSet.add('WebD');
    }

    return Array.from(tagSet);
}

// Controller to add repo to event with automated tags & admin tags
const addRepo = async (req, res) => {
    try {
        const { eventName } = req.params;
        const { repoName, tags, mentors, isFirstYrOnly, isGirlsOnly, description: customDescription } = req.body;

        if (!eventName || !repoName) {
            return response_400(
                res,
                'Event id and repo name are required to add a repo'
            );
        }

        const adminUser = await prisma.admin.findUnique({
            where: {
                userId: req.user.id
            }
        });

        if (!adminUser) {
            return response_400(
                res,
                `${req.user.id} is not an admin/user of this platform`
            );
        }

        const event = await prisma.event.findUnique({
            where: {
                name: eventName
            }
        });

        if (!event) {
            return response_400(res, `Could not find the event`);
        }

        // Get repo description, topics, and language from GitHub API (with proxy support)
        const repoDetails = await getRepoDetails(adminUser.userId, repoName);

        const finalTags = buildRepoTags({
            repoName,
            repoDetails,
            customTags: tags,
            isFirstYrOnly: Boolean(isFirstYrOnly)
        });
        const finalDescription = customDescription || repoDetails?.description || '';
        const finalLanguage = repoDetails?.language || (repoName.toLowerCase().includes('python') ? 'Python' : 'TypeScript');

        let parsedMentors = [];
        if (mentors) {
            const raw = Array.isArray(mentors) ? mentors : (typeof mentors === 'string' ? mentors.split(',') : []);
            parsedMentors = raw.map(m => String(m).trim().replace(/^@/, '')).filter(Boolean);
        }

        if (parsedMentors.length > 0) {
            const validMentors = await prisma.user.findMany({
                where: {
                    githubId: { in: parsedMentors },
                    OR: [
                        { isMentor: true },
                        { isAdmin: true }
                    ]
                },
                select: { githubId: true }
            });

            const validSet = new Set(validMentors.map(m => m.githubId.toLowerCase()));
            const invalidHandles = parsedMentors.filter(h => !validSet.has(h.toLowerCase()));

            if (invalidHandles.length > 0) {
                return response_400(
                    res,
                    `The following users do not have the Mentor role: ${invalidHandles.map(h => '@' + h).join(', ')}. Please assign them the mentor role first.`
                );
            }

            const canonicalMap = new Map(validMentors.map(m => [m.githubId.toLowerCase(), m.githubId]));
            parsedMentors = parsedMentors.map(h => canonicalMap.get(h.toLowerCase()) || h);
        }

        const mentorsJson = JSON.stringify(parsedMentors);

        const updateAdmin = await prisma.admin.update({
            where: {
                userId: adminUser.userId
            },
            data: {
                Repo: {
                    create: {
                        name: repoName,
                        description: finalDescription,
                        tags: JSON.stringify(finalTags),
                        language: finalLanguage,
                        mentors: mentorsJson,
                        isFirstYrOnly: Boolean(isFirstYrOnly),
                        isGirlsOnly: Boolean(isGirlsOnly),
                        event: {
                            connect: {
                                name: eventName
                            }
                        }
                    }
                }
            },
            include: {
                Repo: {
                    where: {
                        name: repoName
                    }
                }
            }
        });

        return response_201(res, 'Repo added successfully', updateAdmin);
    } catch (error) {
        return response_500(res, 'Error while adding repo', error);
    }
};

// Controller to update repo tags, description, language, mentors, or first-year flag
const updateRepoDetails = async (req, res) => {
    try {
        const { eventName, repoName } = req.params;
        const { tags, mentors, language, description, isFirstYrOnly, isGirlsOnly } = req.body;

        if (!eventName || !repoName) {
            return response_400(res, 'Event name and repo name are required');
        }

        const updateData = {};
        if (tags !== undefined) {
            updateData.tags = Array.isArray(tags) ? JSON.stringify(tags) : (typeof tags === 'string' ? tags : JSON.stringify([]));
        }
        if (mentors !== undefined) {
            let parsedMentors = [];
            if (Array.isArray(mentors)) {
                parsedMentors = mentors.map(m => String(m).trim().replace(/^@/, '')).filter(Boolean);
            } else if (typeof mentors === 'string') {
                parsedMentors = mentors.split(',').map(m => m.trim().replace(/^@/, '')).filter(Boolean);
            }

            if (parsedMentors.length > 0) {
                const validMentors = await prisma.user.findMany({
                    where: {
                        githubId: { in: parsedMentors },
                        OR: [
                            { isMentor: true },
                            { isAdmin: true }
                        ]
                    },
                    select: { githubId: true }
                });

                const validSet = new Set(validMentors.map(m => m.githubId.toLowerCase()));
                const invalidHandles = parsedMentors.filter(h => !validSet.has(h.toLowerCase()));

                if (invalidHandles.length > 0) {
                    return response_400(
                        res,
                        `The following users do not have the Mentor role: ${invalidHandles.map(h => '@' + h).join(', ')}. Please assign them the mentor role first.`
                    );
                }

                const canonicalMap = new Map(validMentors.map(m => [m.githubId.toLowerCase(), m.githubId]));
                parsedMentors = parsedMentors.map(h => canonicalMap.get(h.toLowerCase()) || h);
            }

            updateData.mentors = JSON.stringify(parsedMentors);
        }
        if (language !== undefined) updateData.language = language;
        if (description !== undefined) updateData.description = description;
        if (isFirstYrOnly !== undefined) updateData.isFirstYrOnly = Boolean(isFirstYrOnly);
        if (isGirlsOnly !== undefined) updateData.isGirlsOnly = Boolean(isGirlsOnly);

        const updatedRepo = await prisma.repo.update({
            where: { name: repoName },
            data: updateData
        });

        return response_200(res, 'Repo updated successfully', formatRepo(updatedRepo));
    } catch (error) {
        return response_500(res, 'Error while updating repo', error);
    }
};
//deletes repo and ev ery instance of it
const deleteRepo = async (req, res) => {
    try {
        const { eventName, repoName } = req.params;

        if (!eventName || !repoName) {
            return response_400(
                res,
                'Event name and repo name are required to delete a repo'
            );
        }

        const adminUser = await prisma.admin.findUnique({
            where: {
                userId: req.user.id
            }
        });

        if (!adminUser) {
            return response_400(
                res,
                `${req.user.id} is not an admin/user of this platform`
            );
        }

        const event = await prisma.event.findUnique({
            where: {
                name: eventName
            }
        });

        if (!event) {
            return response_400(res, 'Could not find the event');
        }

        const repo = await prisma.repo.findFirst({
            where: {
                name: repoName,
                event: {
                    name: eventName
                }
            }
        });

        if (!repo) {
            return response_404(res, 'Could not find the repo for this event');
        }

        const deletedRepo = await prisma.$transaction(async (transaction) => {
            await transaction.pR.deleteMany({
                where: {
                    issue: {
                        repoName: repo.name
                    }
                }
            });

            await transaction.issue.deleteMany({
                where: {
                    repoName: repo.name
                }
            });

            return transaction.repo.delete({
                where: {
                    id: repo.id
                }
            });
        });

        return response_200(res, 'Repo deleted successfully', deletedRepo);
    } catch (error) {
        return response_500(res, 'Error while deleting repo', error);
    }
};

//renames the repo and every issue and pr associated with it
const renameRepo = async (req, res) => {
    try {
        const { eventName, repoName } = req.params;
        const { newRepoName } = req.body;

        if (!eventName || !repoName || !newRepoName) {
            return response_400(
                res,
                'Event name, repo name and new repo name are required to rename a repo'
            );
        }

        const adminUser = await prisma.admin.findUnique({
            where: {
                userId: req.user.id
            }
        });

        if (!adminUser) {
            return response_400(
                res,
                `${req.user.id} is not an admin/user of this platform`
            );
        }

        const event = await prisma.event.findUnique({
            where: {
                name: eventName
            }
        });

        if (!event) {
            return response_400(res, 'Could not find the event');
        }

        const repo = await prisma.repo.findFirst({
            where: {
                name: repoName,
                event: {
                    name: eventName
                }
            }
        });

        if (!repo) {
            return response_404(res, 'Could not find the repo for this event');
        }

        const updatedRepo = await prisma.$transaction(async (transaction) => {
            const renamedRepo = await transaction.repo.update({
                where: {
                    id: repo.id
                },
                data: {
                    name: newRepoName
                }
            });

            await transaction.issue.updateMany({
                where: {
                    repoName: repo.name
                },
                data: {
                    repoName: newRepoName
                }
            });

            return renamedRepo;
        });

        return response_200(res, 'Repo renamed successfully', updatedRepo);
    } catch (error) {
        return response_500(res, 'Error while renaming repo', error);
    }
};

// Controller to get all repos of an event
const getAllReposOfEvent = async (req, res) => {
    try {
        const { eventName } = req.params;

        const repos = await prisma.repo.findMany({
            where: {
                eventName: eventName
            }
        });

        if (!repos) {
            return response_400(res, `Could not find the repos`);
        }

        return response_200(res, 'Repos fetched successfully', repos.map(formatRepo));
    } catch (error) {
        console.error(error);
        return response_500(res, 'Error while fetching repos', error);
    }
};

// Point increment/decrement mechanisam of a PR (hence leaderboard)
const incrementPoints = async (req, res) => {
    try {
        const {
            eventName,
            repoName,
            githubId,
            prNumber,
            issueNumber,
            pointIncrement
        } = req.body;

        const pr = await prisma.pR.findFirst({
            where: {
                prNumber,
                submitterId: githubId,
                issue: {
                    issueNumber,
                    repoName,
                    repo: {
                        eventName
                    }
                }
            },
            select: {
                id: true,
                issueId: true
            }
        });
        if (!pr) return response_404(res, 'PR NOT FOUND');
        await prisma.participant.update({
            where: {
                participantId: githubId
            },
            data: {
                LeaderboardEntries: {
                    update: {
                        where: {
                            participantId_eventName: {
                                participantId: githubId,
                                eventName: eventName
                            }
                        },
                        data: {
                            points: {
                                increment: pointIncrement
                            },
                            event: {
                                update: {
                                    Repo: {
                                        update: {
                                            where: {
                                                name: repoName
                                            },
                                            data: {
                                                issues: {
                                                    update: {
                                                        where: {
                                                            repoName_issueNumber:
                                                                {
                                                                    repoName:
                                                                        repoName,
                                                                    issueNumber:
                                                                        issueNumber
                                                                }
                                                        },
                                                        data: {
                                                            PR: {
                                                                updateMany: {
                                                                    where: {
                                                                        prNumber:
                                                                            prNumber
                                                                    },
                                                                    data: {
                                                                        points: {
                                                                            increment:
                                                                                pointIncrement
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },

                LeaderboardEvents: {
                    create: {
                        event: {
                            connect: {
                                name: eventName
                            }
                        },
                        prId: pr.id,
                        issueId: pr.issueId,
                        type: 'MANUAL_ADJUSTMENT',
                        pointsDelta: pointIncrement
                    }
                }
            }
        });

        return response_200(res, 'Points updated');
    } catch (error) {
        console.log(error);
        return response_500(res, 'Error while points modification', error);
    }
};


const uploadLeaderboard = async (req, res) => {
    try {
        const { eventName } = req.params;

        if (!eventName) {
            return response_400(res, 'Event name is required');
        }

        // Opencode leaderboard is live and automated via GitHub bot PRs/issues
        if (eventName.toLowerCase().includes('opencode')) {
            return response_400(res, 'Leaderboard upload via SQL is not permitted for Opencode because its leaderboard is live and automated.');
        }

        const event = await prisma.event.findUnique({
            where: { name: eventName }
        });

        if (!event) {
            return response_404(res, 'Event "' + eventName + '" not found');
        }

        if (!req.file || !req.file.buffer) {
            return response_400(res, 'No SQL file uploaded. Please upload a .sql file.');
        }

        if (req.file.originalname && !req.file.originalname.toLowerCase().endsWith('.sql')) {
            return response_400(res, 'Invalid file type. Please upload a .sql file.');
        }

        let fileBuf = req.file.buffer;
        let sql;
        if (fileBuf.length >= 3 && fileBuf[0] === 0xef && fileBuf[1] === 0xbb && fileBuf[2] === 0xbf) {
            sql = fileBuf.toString('utf8').replace(/^\uFEFF/, '');
        } else if (fileBuf.length >= 2 && fileBuf[0] === 0xff && fileBuf[1] === 0xfe) {
            sql = fileBuf.toString('utf16le');
        } else {
            sql = fileBuf.toString('utf8');
        }

        sql = sql.trim();
        if (!sql) {
            return response_400(res, 'The uploaded SQL file is empty.');
        }

        // Prevent destructive system operations
        const destructiveRegex = /\b(DROP\s+DATABASE|DROP\s+TABLE|ALTER\s+USER|GRANT\s+|REVOKE\s+|SHUTDOWN)\b/i;
        if (destructiveRegex.test(sql)) {
            return response_400(res, 'SQL file contains disallowed destructive statements (e.g. DROP DATABASE, DROP TABLE).');
        }

        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            return response_500(res, 'DATABASE_URL configuration is missing on server.');
        }

        const url = new URL(databaseUrl);
        const database = url.pathname ? url.pathname.replace(/^\//, '') : undefined;
        const sslMode = url.searchParams.get('ssl-mode');

        const dbConfig = {
            host: url.hostname,
            port: url.port ? Number(url.port) : 3306,
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database,
            multipleStatements: true
        };

        if (sslMode && sslMode.toUpperCase() === 'REQUIRED') {
            dbConfig.ssl = { rejectUnauthorized: false };
        }

        const conn = await mysql.createConnection(dbConfig);
        try {
            await conn.query(sql);
        } catch (sqlErr) {
            console.error('SQL Execution Error:', sqlErr);
            return response_400(res, 'Failed to execute SQL: ' + (sqlErr.sqlMessage || sqlErr.message));
        } finally {
            try {
                await conn.end();
            } catch {}
        }

        // Integrity pass: ensure every LeaderboardEntry for this event has corresponding User & Participant records
        const entries = await prisma.leaderboardEntry.findMany({
            where: { eventName },
            select: { participantId: true }
        });

        for (const entry of entries) {
            const githubId = entry.participantId;
            if (!githubId) continue;

            await prisma.user.upsert({
                where: { githubId },
                update: {},
                create: {
                    name: githubId,
                    email: `${githubId}@users.noreply.github.com`,
                    githubId,
                    avatarUrl: 'https://avatars.githubusercontent.com/' + githubId,
                    college: 'IIIT Allahabad',
                    graduationYear: 2027,
                    branch: 'N/A',
                    degree: 'N/A',
                    year: 'N/A'
                }
            });

            await prisma.participant.upsert({
                where: { participantId: githubId },
                update: {},
                create: { participantId: githubId }
            });
        }

        const totalEntries = await prisma.leaderboardEntry.count({
            where: { eventName }
        });

        return response_200(res, `Leaderboard SQL executed successfully for event "${eventName}". Found ${totalEntries} participant(s).`, {
            eventName,
            participantCount: totalEntries
        });
    } catch (error) {
        console.error('Error uploading leaderboard SQL:', error);
        return response_500(res, 'Error while uploading and executing leaderboard SQL', error);
    }
};

export {
    createEvent,
    deleteEvent,
    getEvents,
    addAdmin,
    addRepo,
    deleteRepo,
    renameRepo,
    updateRepoDetails,
    getAllReposOfEvent,
    incrementPoints,
    uploadLeaderboard,
    getAllMentors,
    addMentorRole,
    removeMentorRole
};
