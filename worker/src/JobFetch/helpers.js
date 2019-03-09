import mongoose from 'mongoose';
import { logger } from '../logger';
import { JOBS_DB } from '../config';

logger.info("Connecting to job db...");
var jobConn = mongoose.createConnection(JOBS_DB);
logger.info("Connected to db.");

logger.info("Defining fetch job schema...");
const Schema = mongoose.Schema;

const JobFetchSchema = new Schema({
    jobData: {
        date: String,
        lang: String
    },
    logs: [
       {
           step: { type: Number, default: 0 },
           status: { type: String, default: "" },
           message: { type: String, default: "" },
           timestamp: { type: Date, default: Date.now }
       } 
    ],
    created_at: { type: Date, default: Date.now }
});

export const JobFetchModel = jobConn.model('Job', JobFetchSchema);
logger.info("Done defining fetch job schema.");