import { logger } from './logger';

export const jobStatus = [
    "START",
    "RUNNING",
    "SUCCESS",
    "FAILURE"
];

export const delay = function(n) {
    n = n || 2000;
    return new Promise(done => {
        setTimeout(() => {
            done();
        }, n);
    });
};

export const updateJobLog = function(jobDoc, status, step, message) {
    jobDoc.currentStatus = status;
    jobDoc.currentMessage = message;
    jobDoc.currentStep = step;
    jobDoc.updated_at = Date.now();
    logger.info(`${jobDoc._id} - ${status} :: ${message}`);
    return jobDoc.save();
};