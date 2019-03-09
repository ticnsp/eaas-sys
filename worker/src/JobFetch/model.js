import mongoose from 'mongoose';
import { logger } from '../logger';
import { READINGS_DB } from '../config';

logger.info("Connecting to db...");
var readingsConn = mongoose.createConnection(READINGS_DB);
logger.info("Connected to db.");

logger.info("Defining schema...");
const Schema = mongoose.Schema;

const SaintSchema = new Schema({
    id: String,
    name: String,
    short_description: String,
    location: String,
    month: Number,
    day: Number,
    order1: Number,
    order2: Number,
    image_links: {
        large: String,
        face: String,
        ico: String
    },
    bio: String,
    bio_source: String,
    prayer: String,
    href: String
});

const ReadingSchema = new Schema({
    id: String,
    reading_code: String,
    before_reading: String,
    chorus: String,
    type: {
        type: String
    },
    audio_url: String,
    reference_displayed: String,
    book: {
        code: String,
        short_title: String,
        full_title: String
    },
    text: String,
    href: String,
    source: String,
    book_type: String,
    title: String
});

const CommentarySchema = new Schema({
    id: String,
    title: String,
    book_type: String,
    description: String,
    source: String,
    author: {
        name: String,
        short_description: String
    },
    href: String
});

const LiturgySchema = new Schema({
    id: String,
    title: String,
    description: String,
    source: String,
    image_links: {
        large: String,
        ico: String
    },
    href: String
});

const LiturgyDaySchema = new Schema({
    date: String,
    lang: String,
    date_displayed: String,
    liturgic_title: String,
    has_liturgic_description: Boolean,
    links: [
        {
            rel: String,
            uri: String
        }
    ],
    special_liturgy: String,
    liturgy: LiturgySchema,
    commentary: CommentarySchema,
    readings: [ReadingSchema],
    saints: [SaintSchema]
});

export const SaintModel = readingsConn.model('Saint', SaintSchema);
export const ReadingModel = readingsConn.model('Reading', ReadingSchema);
export const CommentaryModel = readingsConn.model('Commentary', CommentarySchema);
export const LiturgyModel = readingsConn.model('Liturgy', LiturgySchema);
export const LiturgyDayModel = readingsConn.model('LiturgyDay', LiturgyDaySchema);
logger.info("Done defining schema.");