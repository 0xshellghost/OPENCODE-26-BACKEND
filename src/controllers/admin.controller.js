import * as XLSX from 'xlsx';
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

// Controller to add repo to event
const addRepo = async (req, res) => {
    try {
        const { eventName } = req.params;
        const { repoName } = req.body; //repoName should be a valid repo that exists on github

        if (!eventName || !repoName) {
            response_400(
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
            response_400(
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
            response_400(res, `Could not find the event`);
        }

        // get the repo description from github api
        const repoDetails = await getRepoDetails(adminUser.userId, repoName);

        // add repo to event
        if (repoDetails) {
            const updateAdmin = await prisma.admin.update({
                where: {
                    userId: adminUser.userId
                },
                data: {
                    Repo: {
                        create: {
                            name: repoName,
                            description: repoDetails.description,
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
            response_201(res, 'Repo added successfully', updateAdmin);
        } else {
            response_404(res, 'Could not find the repo');
        }
    } catch (error) {
        response_500(res, 'Error while adding repo', error);
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
            response_400(res, `Could not find the repos`);
        }

        response_200(res, 'Repos fetched successfully', repos);
    } catch {
        console.log(error);
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

        const event = await prisma.event.findUnique({
            where: { name: eventName }
        });

        if (!event) {
            return response_404(res, 'Event "' + eventName + '" not found');
        }

        if (!req.file || !req.file.buffer) {
            return response_400(res, 'No spreadsheet file uploaded. Please upload a .csv or .xlsx file.');
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            return response_400(res, 'The uploaded spreadsheet contains no sheets.');
        }

        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet);

        if (!rawRows || rawRows.length === 0) {
            return response_400(res, 'The spreadsheet is empty or has no data rows.');
        }

        const getRowValue = (row, possibleKeys) => {
            for (const key of Object.keys(row)) {
                const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                for (const expected of possibleKeys) {
                    if (cleanKey === expected) {
                        return row[key];
                    }
                }
            }
            return undefined;
        };

        let processedCount = 0;

        for (const row of rawRows) {
            const rawGithubId = getRowValue(row, ['githubusername', 'githubid', 'github', 'username']);
            const githubId = String(rawGithubId || '').trim();

            if (!githubId) {
                continue;
            }

            const rawName = getRowValue(row, ['name', 'fullname', 'participantname', 'participant']);
            const name = String(rawName || githubId).trim();

            const rawPoints = getRowValue(row, ['points', 'point', 'score', 'pts']);
            const points = parseInt(rawPoints, 10) || 0;

            const rawCollege = getRowValue(row, ['college', 'collegename', 'university', 'institute']);
            const college = String(rawCollege || 'IIIT Allahabad').trim();

            const rawGradYear = parseInt(getRowValue(row, ['graduationyear', 'gradyear', 'year', 'batch']), 10);
            const graduationYear = !Number.isNaN(rawGradYear) && rawGradYear >= 2000 && rawGradYear <= 2100 ? rawGradYear : 2027;

            const branch = String(getRowValue(row, ['branch', 'department']) || 'N/A').trim();
            const degree = String(getRowValue(row, ['degree', 'course']) || 'N/A').trim();
            const year = String(getRowValue(row, ['currentyear', 'studyingyear']) || 'N/A').trim();

            await prisma.user.upsert({
                where: { githubId },
                update: {
                    name,
                    college,
                    graduationYear,
                    avatarUrl: 'https://avatars.githubusercontent.com/' + githubId
                },
                create: {
                    name,
                    email: githubId + '@users.noreply.github.com',
                    githubId,
                    avatarUrl: 'https://avatars.githubusercontent.com/' + githubId,
                    college,
                    graduationYear,
                    branch,
                    degree,
                    year
                }
            });

            await prisma.participant.upsert({
                where: { participantId: githubId },
                update: {},
                create: { participantId: githubId }
            });

            await prisma.leaderboardEntry.upsert({
                where: {
                    participantId_eventName: {
                        participantId: githubId,
                        eventName
                    }
                },
                update: {
                    points,
                    PRmerged: 0
                },
                create: {
                    participantId: githubId,
                    eventName,
                    points,
                    PRmerged: 0
                }
            });

            processedCount++;
        }

        return response_200(res, 'Leaderboard updated successfully with ' + processedCount + ' participants.', {
            eventName,
            participantCount: processedCount
        });
    } catch (error) {
        console.error('Error uploading leaderboard:', error);
        return response_500(res, 'Error while uploading leaderboard spreadsheet', error);
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
    getAllReposOfEvent,
    incrementPoints,
    uploadLeaderboard
};
