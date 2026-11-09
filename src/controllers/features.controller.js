import prisma from '../config/db.config.js';
import { response_200, response_400, response_500 } from '../utils/responseCodes.js';

const DEFAULT_FEATURES = {
    showWinners: true,
    showMilestones: true,
    showLeaderboard: true,
    showRepositories: true,
    showRPlace: true,
};

export async function getPlatformFeatures(req, res) {
    try {
        let feature = await prisma.platformFeature.findUnique({
            where: { id: 1 },
        });

        if (!feature) {
            feature = await prisma.platformFeature.create({
                data: {
                    id: 1,
                    ...DEFAULT_FEATURES,
                },
            });
        }

        return response_200(res, 'Features retrieved successfully', {
            showWinners: Boolean(feature.showWinners),
            showMilestones: Boolean(feature.showMilestones),
            showLeaderboard: Boolean(feature.showLeaderboard),
            showRepositories: Boolean(feature.showRepositories),
            showRPlace: Boolean(feature.showRPlace),
        });
    } catch (err) {
        console.error('[getPlatformFeatures] Error:', err);
        return response_500(res, 'Failed to fetch platform features', err);
    }
}

export async function updatePlatformFeatures(req, res) {
    try {
        const body = req.body || {};
        const updateData = {};

        if (typeof body.showWinners === 'boolean') updateData.showWinners = body.showWinners;
        if (typeof body.showMilestones === 'boolean') updateData.showMilestones = body.showMilestones;
        if (typeof body.showLeaderboard === 'boolean') updateData.showLeaderboard = body.showLeaderboard;
        if (typeof body.showRepositories === 'boolean') updateData.showRepositories = body.showRepositories;
        if (typeof body.showRPlace === 'boolean') updateData.showRPlace = body.showRPlace;

        if (Object.keys(updateData).length === 0) {
            return response_400(res, 'No valid feature fields provided for update');
        }

        const updated = await prisma.platformFeature.upsert({
            where: { id: 1 },
            update: updateData,
            create: {
                id: 1,
                ...DEFAULT_FEATURES,
                ...updateData,
            },
        });

        return response_200(res, 'Features updated successfully', {
            showWinners: Boolean(updated.showWinners),
            showMilestones: Boolean(updated.showMilestones),
            showLeaderboard: Boolean(updated.showLeaderboard),
            showRepositories: Boolean(updated.showRepositories),
            showRPlace: Boolean(updated.showRPlace),
        });
    } catch (err) {
        console.error('[updatePlatformFeatures] Error:', err);
        return response_500(res, 'Failed to update platform features', err);
    }
}
