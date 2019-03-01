import axios from 'axios';
import winston from 'winston';
import mongoose from 'mongoose';
import amqplib from 'amqplib';
import { Buffer } from 'safe-buffer';

function delay(n) {
    n = n || 2000;
    return new Promise(done => {
        setTimeout(() => {
            done();
        }, n);
    });
}

/*
 * Logger
 */
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


const q = 'fetch_queue';


/*
 * Main function
 */
const connect = async function() {
    // connect to rabbit mq
    let mqconn = undefined;
    let fetchchan = undefined;

    try {
        logger.info("Waiting 10 seconds before connecting to queue...");
        await delay(10000);
        logger.info("Done waiting.");
    } catch (err) {
        logger.error("Timeout error...");
        logger.error(err);
        logger.info("Exiting (1)");
        process.exit(1);
    }

    try {
        logger.info("Connecting to rabbitmq...");
        mqconn = await amqplib.connect('amqp://rabbitmq');
        logger.info("Connected.");
    } catch (err) {
        logger.error("Error connecting to rabbitmq...");
        logger.error(err);
        logger.info("Exiting (1)");
        process.exit(1);
    }

    try {
        logger.info("Creating fetch channel...");
        fetchchan = await mqconn.createChannel();
        logger.info("Fetch channel created.");
    } catch (err) {
        logger.error("Error creating fetch channel...");
        logger.error(err);
        logger.info("Exiting (1)");
        process.exit(1);
    }

    // Connect to queue
    logger.info("Connecting to queue...");
    fetchchan.assertQueue(q, { durable: true });
    logger.info("Connected to queue.");

    // Prefetch
    fetchchan.prefetch(1);

    // Get eaas db connection ready
    // 3) Connect to database
    logger.info("Connecting to db...");
    mongoose.connect('mongodb://db/ticnsp-eaas-readings');
    logger.info("Connected to db.");

    // Ready
    logger.info("Ready to process jobs.");


  // Do job on message
fetchchan.consume(q, async (msg) => {
    try {
        // worker_fetch_1  | info: Received data:  {"fields":{"consumerTag":"amq.ctag-mrYntwMbcnltIDIpIytFcw","deliveryTag":1,"redelivered":false,"exchange":"","routingKey":"fetch_queue"},"properties":{"headers":{}},"content":{"type":"Buffer","data":[123,34,108,97,110,103,34,58,34,83,80,34,44,34,100,97,116,101,34,58,34,50,48,49,57,45,48,49,45,50,54,34,125]}}
        logger.debug("Received data: ", msg);

        // Create new buffer
        const buf1 = Buffer.from(msg.content);

        logger.debug("Buffered: ", buf1);

        logger.debug("Parsing data...");
        // 0) Parse data
        const jobData = JSON.parse(buf1.toString());
        logger.debug("Data parsed.");

        // 1) Get parameters
        const lang = jobData.lang;
        const date = jobData.date;

        logger.info(`Starting job fetcher for ${lang}, ${date}`);

        // 1.5) Check if data already exists
        let existingDoc = await LiturgyDayModel.findOne({ date: date, lang: lang });
        let shouldFetch = false;

        if (existingDoc) {
            // Document exists, check content
            logger.info(`Found existing document ${existingDoc.id}, checking content...`);

            let existingDocReadings = existingDoc.get('readings');
            if (existingDocReadings.length <= 0) {
                // Document does not have readings, should delete and re-fetch
                logger.info(`Invalid content, removing ${existingDoc.id}...`);
                await LiturgyDayModel.deleteOne({ id: existingDoc.id });
                shouldFetch = true;
                logger.info(`Document cleaned, ready for re-fetch.`);

            } else {
                logger.info(`Valid content, skipping fetch...`);
            }
        } else {
            // Document does not exists, we need it
            shouldFetch = true;
            console.info(`Existing document ${existingDoc}`);
        }

        if (shouldFetch) {
            // 2) Fetch from evangelizo.org
            const url = `https://publication.evangelizo.ws/${lang}/days/${date}`;
            let data = {};

            logger.info(`Fetching data from URL ${url} ...`);
            const response = await axios.get(url);
            data = response.data.data;
            data.lang = lang;

            logger.info(`Fetch data done.`);

            // 5) Save to database
            logger.info(`Inserting data into db:`);
            const savedReadings = await ReadingModel.insertMany(data.readings);
            logger.info(`Inserted readings...`);
            const savedSaints = await SaintModel.insertMany(data.saints);
            logger.info(`Inserted saints...`);
            const savedCommentary = await CommentaryModel.create(data.commentary);
            logger.info(`Inserted commentary...`);
            const savedLiturgy = await LiturgyModel.create(data.liturgy);
            logger.info(`Inserted Liturgy...`);

            data.readings = [];
            data.saints = [];
            data.liturgy = {};
            data.commentary = {};

            let newLiturgyDay = new LiturgyDayModel(
                data
            );
            logger.info(`Inserted additional data...`);

            for (var saint of savedSaints) {
                newLiturgyDay.saints.push(saint);
            }
            logger.info(`Attached saints to day...`);

            for (var reading of savedReadings) {
                newLiturgyDay.readings.push(reading);
            }
            logger.info(`Attached readings to day...`);

            newLiturgyDay.liturgy = savedLiturgy;
            logger.info(`Attached liturgy to day...`);

            newLiturgyDay.commentary = savedCommentary;
            logger.info(`Attached commentary to day...`);

            logger.info(`Saving day...`);
            const savedLiturgyDay = await newLiturgyDay.save();

            logger.info(`Inserting data done.`);

            logger.debug(savedLiturgyDay);
        }

        logger.info(`Completed job fetcher for ${lang}, ${date}`);
        fetchchan.ack(msg);

    } catch (error) {
        logger.error(error);
    }

}, { noAck: false });
    return fetchchan;
};

const fetchchan = connect();

