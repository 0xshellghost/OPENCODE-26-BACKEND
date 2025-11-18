import { IssueStatus, PRStatus } from '@prisma/client';
import prisma from '../config/db.config.js';
import { commentOnAPullRequest } from '../utils/commentOnAPullRequest.js';
import {
    CLOSED_ISSUE_PR_ERROR,
    commentBuilder,
    INVALID_ISSUE_NUMBER_ERROR,
    NOT_ASSIGNED_PR_ERROR,
    NOT_ASSIGNED_TO_YOU_PR_ERROR,
    NOT_REGISTERED_ASSIGNED_ERROR,
    PR_OPEN_SUCCESS,
    PR_OPENED_UNREGISTERED_ERROR,
    TEMPLATE_NOT_FOLLOWED_ERROR,
    MAX_ISSUE_LIMIT
} from '../utils/comments.js';
import {commentOnAnIssue, fetchCommentsFromGitHub} from '../utils/commentOnAnIssue.js';
export const routerFunction = (req, res) => {
    switch (req.headers['x-github-event']) {
        case 'issues':
            switch (req.body.action) {
                case 'assigned':
                    issueAssigned(req, res);
                    break;
                case 'unassigned':
                    issueUnassigned(req, res);
                    break;
                case 'labeled':
                    issueLabeled(req, res);
                    break;
                case 'unlabeled':
                    issueUnlabeled(req, res);
                    break;
                case 'opened':
                    issueOpened(req, res);
                    break;
                case 'closed':
                    issueClosed(req, res);
                    break;
                case 'reopened':
                    issueReopened(req,res);
                    break;
                default:
                    return res.status(200).json();
            }
            break;
        case 'issue_comment':
            switch (req.body.action) {
                case 'created':
                    issueCommentCreated(req, res);
                    console.log("New comment created on issue or pull request");
                    break;
                default:
                    return res.status(200).json();
                }
            break;
        case 'pull_request':
            switch (req.body.action) {
                case 'opened':
                    pullRequestOpened(req, res);
                    console.log("hello form switch case");
                    break;
                case 'edited':
                    pullRequestOpened(req, res);
                    break;
                case 'closed':
                    if (req.body.pull_request.merged)
                        pullRequestMerged(req, res);
                    else pullRequestClosed(req, res);
                    break;
                case 'reopened':
                    pullRequestReopened(req,res);
                    break;
                default:
                    return res.status(200).json();
            }
            break;

        // case 'push' :
        //     push(req, res)
        //     console.log("SOMETHING PUSGED");
        //     break;

        default:
            return res.status(400);
    }
};

const push = async (req, res) => {

    try {
        const commits = req.body.commits 
        console.log(commits)
    }
    catch(err) {
        console.log("Some error: ", err)
    }
}

const issueAssigned = async (req, res) => {
    try {
        const issueNumber = req.body.issue.number;
        const repoName = req.body.repository.name;
        const githubId = req.body.assignee.login;

        const assigneeId = await prisma.participant.findUnique({
            where: {
                participantId: githubId
            }
        });
        if (!assigneeId) {
            commentOnAPullRequest(
                repoName,
                issueNumber,
                commentBuilder(githubId, NOT_REGISTERED_ASSIGNED_ERROR)
            );
        } else {
            await prisma.issue.update({
                where: {
                    repoName_issueNumber: {
                        repoName: repoName,
                        issueNumber: issueNumber
                    }
                },
                data: {
                    assigneeId: githubId,
                    status: IssueStatus.ASSIGNED
                }
            });
        }

        return res.status(200).json();
    } catch (error) {
        console.error(error);
        return res.status(200).json();
    }
};

const issueUnassigned = async (req, res) => {
    try {
        const issueNumber = req.body.issue.number;
        const repoName = req.body.repository.name;
        await prisma.issue.update({
            where: {
                repoName_issueNumber: {
                    repoName: repoName,
                    issueNumber: issueNumber
                }
            },
            data: {
                assigneeId: null,
                status: IssueStatus.OPEN
            }
        });
        return res.status(200).json();
    } catch (error) {
        console.error(error);
        return res.status(200).json();
    }
};

const issueLabeled = async (req, res) => {
    try {
        const issueNumber = req.body.issue.number;
        const repoName = req.body.repository.name;
        const label = req.body.label.name.trim().toLowerCase();
        const openForAll =
            label === 'open-for-all' ||
            label === 'competitive';
        const currentPoints = parseInt(label.match(/\d+/)?.at(0) ?? 0, 10);
        if (openForAll || currentPoints) {
            await prisma.issue.update({
                where: {
                    repoName_issueNumber: {
                        repoName: repoName,
                        issueNumber: issueNumber
                    }
                },
                data: {
                    ...(openForAll && { openForAll: true }),
                    ...(currentPoints !== 0 && { currentPoints: currentPoints })
                }
            });
        }
    } catch (error) {
        console.error(error);
        return res.status(200).json();
    }
};

const issueUnlabeled = async (req, res) => {
    try {
        const issueNumber = req.body.issue.number;
        const repoName = req.body.repository.name;
        const label = req.body.label.name.trim().toLowerCase();
        const openForAll = !['everyone', 'open-for-all', 'competitive'].some(
            (keyword) => label.trim().toLowerCase() === keyword
        );
        if (!openForAll) {
            await prisma.issue.update({
                where: {
                    repoName_issueNumber: {
                        repoName: repoName,
                        issueNumber: issueNumber
                    }
                },
                data: {
                    openForAll: openForAll
                }
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(200).json();
    }
};

const issueOpened = async (req, res) => {
    try {
        const {
            repository: { name: repoName },
            issue: { title, number: issueNumber, labels }
        } = req.body;
        let openForAll = false;
        let currentPoints = 0;
        labels.forEach(({ name: label }) => {
            if (
                ['everyone', 'open-for-all', 'competitive'].some(
                    (keyword) => label.trim().toLowerCase() === keyword
                )
            ) {
                openForAll = true;
            }
            if (label.toLowerCase().includes('point')) {
                currentPoints = parseInt(label.match(/\d+/)?.at(0) ?? 0, 10);
            }
        });
        await prisma.issue.create({
            data: {
                repoName: repoName,
                title: title,
                issueNumber: issueNumber,
                openForAll: openForAll,
                currentPoints: currentPoints
            }
        });
        return res.status(200).json();
    } catch (error) {
        console.error(error);
        return res.status(200).json();
    }
};

const issueClosed = async (req, res) => {
    try {
        const issueNumber = req.body.issue.number;
        const repoName = req.body.repository.name;

        await prisma.issue.update({
            where: {
                repoName_issueNumber: {
                    repoName: repoName,
                    issueNumber: issueNumber
                }
            },
            data: {
                status: IssueStatus.CLOSED
            }
        });
        return res.status(200).json();
    } catch (error) {
        console.error(error);
        return res.status(200).json();
    }
};

const issueReopened = async (req, res) => {
    try {
        const issueNumber = req.body.issue.number;
        const repoName = req.body.repository.name;

        await prisma.issue.update({
            where: {
                repoName_issueNumber: {
                    repoName: repoName,
                    issueNumber: issueNumber
                }
            },
            data: {
                status: IssueStatus.OPEN
            }
        });
        return res.status(200).json();
    } catch (error) {
        console.error(error);
        return res.status(200).json();
    }
};


const issueCommentCreated = async (req, res) => {
    try {
        const issueNumber = req.body.issue.number;
        const repoName = req.body.repository.name;
        const commentBody = req.body.comment.body;
        if (commentBody.startsWith('/assign')) {
            const assignee = req.body.issue.user.login; 
            console.log(assignee);
            
            if (!assignee) {
                return res.status(400).json({ error: 'No assignee specified in the command.' });
            }

            const activeIssues = await prisma.issue.findMany({
                where: {
                    assigneeId: assignee,
                    status: 'ASSIGNED', 
                },
            });

            if (activeIssues.length >= 3) {
                await commentOnAnIssue(repoName, issueNumber, commentBuilder(assignee, MAX_ISSUE_LIMIT));
                return res.status(200).json();
            }
            return res.status(200).json();
        }

        if (commentBody.startsWith('/info')) {
            const comments = await fetchCommentsFromGitHub( repoName, issueNumber);
            const uniqueUsers = [...new Set(comments.map(comment => comment.user.login))];
            const userIssueData = await Promise.all(
                uniqueUsers.map(async (user) => {
                    const issues = await prisma.issue.findMany({
                        where: { assigneeId: user },
                        select: {
                            title: true,
                            repoName: true,
                            status: true
                        }
                    });

                    return {
                        user,
                        issues: issues.map(issue => ({
                            title: issue.title,
                            repoName: issue.repoName,
                            status: issue.status
                        }))
                    };
                })
            );


            const tableHeader = '| User | Repo | Issue Title | Status |\n|------|------|-------------|--------|\n';
            const tableRows = userIssueData
                .flatMap(({ user, issues }) =>
                    issues.map(issue => `| ${user} | ${issue.repoName} | ${issue.title} | ${issue.status} |`)
                )
                .join('\n');

            const responseComment = tableHeader + tableRows;

            await commentOnAnIssue( repoName, issueNumber, responseComment);
            return res.status(200).json();
        }
        return res.status(200).json();
    } catch (error) {
        console.error('Error in issueCommentCreated:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


const pullRequestOpened = async (req, res) => {
    try {
        const githubId = req.body.pull_request.user.login;
        const repoName = req.body.repository.name;
        const { body, number: PRNumber, title, id } = req.body.pull_request;
        let issueNumber=0;
        if(/Issue\s*:\s*#(\d+)/i.test(body)){
            console.log("2");
            const match = body.match(/Issue\s*:\s*#(\d+)/i);
            issueNumber = match ? parseInt(match[1], 10) : null;
        }
        //const issueNumber = parseInt(body.match(/Issue\s*:\s*#(\d+)/i)?.[1],10);
        //console.log("issue num " + issueNumber);
        if (issueNumber!==0) {
            console.log("4");

            const participant = await prisma.participant.findUnique({
                where: {
                    participantId: githubId
                }
            });
            if (!participant) {
                commentOnAPullRequest(
                    repoName,
                    PRNumber,
                    commentBuilder(githubId, PR_OPENED_UNREGISTERED_ERROR)
                );
            } else {
                const issue = await prisma.issue.findUnique({
                    where: {
                        repoName_issueNumber: {
                            repoName: repoName,
                            issueNumber: issueNumber
                        }
                    },
                    select: {
                        id: true,
                        status: true,
                        currentPoints: true,
                        openForAll: true,
                        assigneeId: true
                    }
                });
                if (!issue) {
                    commentOnAPullRequest(
                        repoName,
                        PRNumber,
                        commentBuilder(githubId, INVALID_ISSUE_NUMBER_ERROR)
                    );
                } else if (issue.status === IssueStatus.CLOSED) {
                    commentOnAPullRequest(
                        repoName,
                        PRNumber,
                        commentBuilder(githubId, CLOSED_ISSUE_PR_ERROR)
                    );
                } else if (
                    issue.status === IssueStatus.ASSIGNED &&
                    issue.openForAll === false
                ) {
                    if (participant.participantId === issue.assigneeId) {
                        await prisma.pR.create({
                            data: {
                                id: id,
                                title: title,
                                submitterId: participant.participantId,
                                issueId: issue.id,
                                prNumber: PRNumber,
                                points: issue.currentPoints
                            }
                        });
                        commentOnAPullRequest(
                            repoName,
                            PRNumber,
                            commentBuilder(githubId, PR_OPEN_SUCCESS)
                        );
                    } else {
                        commentOnAPullRequest(
                            repoName,
                            PRNumber,
                            commentBuilder(
                                githubId,
                                NOT_ASSIGNED_TO_YOU_PR_ERROR
                            )
                        );
                    }
                } else if (
                    issue.status === IssueStatus.OPEN &&
                    issue.openForAll === false
                ) {
                    commentOnAPullRequest(
                        repoName,
                        PRNumber,
                        commentBuilder(githubId, NOT_ASSIGNED_PR_ERROR)
                    );
                } else {
                    console.log('yha');
                    await prisma.pR.create({
                        data: {
                            id: id,
                            title: title,
                            submitterId: participant.participantId,
                            issueId: issue.id,
                            prNumber: PRNumber,
                            points: issue.currentPoints
                        }
                    });
                    commentOnAPullRequest(
                        repoName,
                        PRNumber,
                        commentBuilder(githubId, PR_OPEN_SUCCESS)
                    );
                }
            }
        } else {
            commentOnAPullRequest(
                repoName,
                PRNumber,
                commentBuilder(githubId,TEMPLATE_NOT_FOLLOWED_ERROR)
            );
        }
        return res.status(200).json();
    } catch (error) {
        console.error(error);
        return res.status(200).json();
    }
};

const pullRequestClosed = async (req, res) => {
    try {
        const { number: PRNumber, id } = req.body.pull_request;
        await prisma.pR.update({
            where: {
                id: id,
                prNumber: PRNumber
            },
            data: {
                status: PRStatus.REJECTED
            }
        });
        return res.status(200).json();
    } catch (error) {
        return res.status(200).json();
    }
};

const pullRequestReopened = async (req, res) => {
    try {
        const { number: PRNumber, id } = req.body.pull_request;
        await prisma.pR.update({
            where: {
                id: id,
                prNumber: PRNumber
            },
            data: {
                status: PRStatus.OPENED
            }
        });
        return res.status(200).json();
    } catch (error) {
        return res.status(200).json();
    }
};

const pullRequestMerged = async (req, res) => {
    try {
        const repoName = req.body.repository.name;
        const { id, number: PRNumber, body } = req.body.pull_request;
        const githubId = req.body.pull_request.user.login;
        const issueNumber = parseInt(
            body.match(/Issue\s*:\s*#(\d+)/i)?.[1],
            10
        );
        if (!issueNumber) {
            commentOnAPullRequest(
                repoName,
                PRNumber,
                commentBuilder(githubId, TEMPLATE_NOT_FOLLOWED_ERROR)
            );
            return res.status(200).json();
        }

        const issueData = await prisma.issue.findUnique({
            where: {
                repoName_issueNumber: {
                    repoName: repoName,
                    issueNumber: issueNumber
                },
                OR: [
                    {
                        openForAll: true
                    },
                    {
                        status: IssueStatus.ASSIGNED,
                        assigneeId: githubId
                    }
                ]
            },
            include: {
                repo: {
                    select: {
                        eventName: true
                    }
                }
            }
        });
        const eventName = issueData.repo.eventName;
        const currentPoints = issueData.currentPoints;
        await prisma.pR.update({
            where: {
                id: id,
                prNumber: PRNumber
            },
            data: {
                status: PRStatus.MERGED,
                points: currentPoints,
                submitter: {
                    update: {
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
                                        increment: currentPoints
                                    },
                                    PRmerged: {
                                        increment: 1
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        // OpenCode
        const PR_MERGED = `Hey @${githubId}\n\nYour PR has been merged 🥳🥳 and you have earned **${currentPoints} points**. \n\nThanks for contributing in OpenCode\'24 ✨✨`;
        // GeekCamp
        //const PR_MERGED = `Hey @${githubId}\n\nYour PR has been merged 🥳🥳 and you have earned **${currentPoints} points**. \n\nThanks for participating in GeekCamp ✨✨`;
        commentOnAPullRequest(repoName, PRNumber, PR_MERGED);

        return res.status(200).json();
    } catch (error) {
        console.error(error);
        return res.status(200).json();
    }
};
