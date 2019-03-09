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
    let currentDate = Date.now();
    jobDoc.logs.push(
        {
            step,
            status,
            message,
            currentDate
        }
    );
    logger.info(`${jobDoc._id} - ${status} :: ${message}`);
    return jobDoc.save();
};