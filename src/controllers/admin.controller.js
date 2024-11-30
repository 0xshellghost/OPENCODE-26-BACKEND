import { PRStatus } from '@prisma/client';
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
        const { title, description, startDate, endDate } = req.body;
        console.log(req.body);
        const { logoImage, coverImages } = req.files;
        if (!title || !description || !logoImage) {
            response_400(
                res,
                'Title, description are required to create an event'
            );
        }
        const userId = req.user.id;
        const admin = await prisma.admin.findUnique({
            where: {
                userId: userId //LHS = userId (numbers), RHS = userId (string (username))
            }
        });
        if (admin) {
            const logoImageCloudinary = (await getDataURI(logoImage[0]))
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
            const coverImageLinks = await Promise.all(
                coverImages.map(async (coverImage, idx) => {
                    const coverImageCloudinary = (await getDataURI(coverImage))
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
                    coverImagesURL: {
                        createMany: {
                            data: coverImageLinks.map((coverImage) => {
                                return {
                                    url: coverImage
                                };
                            })
                        }
                    }
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

            response_201(res, 'Event created successfully', data);
        } else {
            response_403(res, 'Only admins can create events');
        }
    } catch (error) {
        response_500(res, 'Error while creating event', error);
    }
};

const deleteEvent = async (req, res) => {
    try {
        const { eventName } = req.params;
        if (!eventName) {
            response_400(res, 'Event id is required to delete an event');
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

        response_204(res, 'Event deleted successfully');
    } catch (error) {
        response_500(res, 'Error while deleting event', error);
    }
};

const getEvents = async (req, res) => {
    try {
        const userId = req.user.id;

        const admin = await prisma.admin.findUnique({
            where: {
                userId: userId
            },
            include: {
                Event: true
            }
        });
        const events = admin.Event?.filter((event) => !event.deletedAt);

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
    } catch (error) {
        response_500(res, 'Error while fetching repos', error);
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
                }
            }
        });

        response_200(res, 'Points updated');
    } catch (error) {
        console.log(error);
        response_500(res, 'Error while points modification', error);
    }
};

export {
    createEvent,
    deleteEvent,
    getEvents,
    addAdmin,
    addRepo,
    getAllReposOfEvent,
    incrementPoints
};
