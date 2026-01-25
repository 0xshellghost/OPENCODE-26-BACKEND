import prisma from '../config/db.config.js';
import { response_200, response_400, response_404, response_500 } from '../utils/responseCodes.js';

const getDetail = async (req, res) => {
    try {
        const { type, id } = req.params;

        let data;
        switch (type) {
            case 'participant':
                data = await prisma.participant.findUnique({
                    where: { participantId: id },
                    include: {
                        User: true,
                        PR: true,
                        LeaderboardEntries: true
                    }
                });
                break;
            case 'event':
                data = await prisma.event.findUnique({
                    where: { name: id },
                    include: {
                        Repo: true,
                        LeaderBoardEntries: true
                    }
                });
                break;
            default:
                return response_400(res, 'Invalid type specified');
        }

        if (!data) {
            return response_404(res, `${type} not found`);
        }

        return response_200(res, `${type} details`, data);
    } catch (error) {
        response_500(res, 'Error fetching details', error);
    }
};

export { getDetail };