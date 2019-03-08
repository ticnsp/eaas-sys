import express from 'express';
import winston from 'winston';
import mongoose from 'mongoose';

function delay(n) {
    n = n || 2000;
    return new Promise(done => {
        setTimeout(() => {
            done();
        }, n);
    });
}

const app = express();
const port = process.env.PORT;

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console()
    ]
});

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

const SaintModel = mongoose.model('Saint', SaintSchema);
const ReadingModel = mongoose.model('Reading', ReadingSchema);
const CommentaryModel = mongoose.model('Commentary', CommentarySchema);
const LiturgyModel = mongoose.model('Liturgy', LiturgySchema);
const LiturgyDayModel = mongoose.model('LiturgyDay', LiturgyDaySchema);
logger.info("Done defining schema.");

// Get eaas db connection ready
logger.info("Connecting to db...");
mongoose.connect('mongodb://db/ticnsp-eaas-readings');
logger.info("Connected to db.");


app.get('/health', (req, res) => {
    logger.info(`${req.ip} requested health status`);
    res.status(200).send('OK');
}); 

app.get('/liturgy/:date/:lang', async (req, res) => {
    let dateparm = req.params.date;
    let langparm = req.params.lang;
    logger.info(req.params.date);
    let doc = undefined;
    try {
        doc = await LiturgyDayModel.findOne({
            date: dateparm,
            lang: langparm
        });
    } catch (err) {
        logger.error(err);
    }

    

    res.status(200).send(JSON.stringify(doc));
});

(async function() {
    await app.listen(port, () => {
        logger.info(`TICNSP server listening on port ${port}`);
    });
})();