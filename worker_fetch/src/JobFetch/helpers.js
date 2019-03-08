import mongoose2 from 'mongoose';
import { logger } from '../logger';
import { JOBS_DB } from '../config';

logger.info("Connecting to job db...");
mongoose2.connect(JOBS_DB);
logger.info("Connected to db.");

logger.info("Defining fetch job schema...");
const Schema = mongoose2.Schema;

const JobFetchSchema = new Schema({
    date: String,
    lang: String,
    currentStep: { type: Number, default: 0 },
    currentStatus: { type: String, default: "STARTING" },
    currentMessage: { type: String, default: "" },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date }
});

export const JobFetchModel = mongoose2.model('Job', JobFetchSchema);
logger.info("Done defining fetch job schema.");