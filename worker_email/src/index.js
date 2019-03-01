import axios from 'axios';
import winston from 'winston';
import winstonMongo from 'winston-mongodb';
import mongoose from 'mongoose';

winston.add(winstonMongo, {
    level: 'info',
    silent: true,
    db: '',
    collection: '',
    host: 'db'
});

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


fetcherQueue.process(async (job, done) => {
    // 1) Get parameters
    const lang = job.data.lang;
    const date = job.data.date;

    logger.info(`Starting job fetcher for ${lang}, ${date}`);

    /* job.reportProgress({ 
        step: 1, 
        totalSteps: 5, 
        message: `Parameters - Lang: ${lang}, Date: ${date}`
    }); */
    job.reportProgress(1);

    // 2) Fetch from evangelizo.org
    const url = `https://publication.evangelizo.ws/${lang}/days/${date}`;
    let data = {};

    try {
        const response = await axios.get(url);
        data = response.data.data;
    } catch(error) {
        logger.error(error);
        throw error;
    }

    /* job.reportProgress({
        step: 2,
        totalSteps: 5,
        message: `Fetched data`
    }); */
    job.reportProgress(2);

    // 3) Connect to database
    mongoose.connect('mongodb://db/ticnsp-eaas');

    job.reportProgress(3);

    // 4) Define Schema
    const Schema = mongoose.Schema;

    try {
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
    

    job.reportProgress(4);

    const SaintModel = mongoose.model('Saint', SaintSchema);
    const ReadingModel = mongoose.model('Reading', ReadingSchema);
    const CommentaryModel = mongoose.model('Commentary', CommentarySchema);
    const LiturgyModel = mongoose.model('Liturgy', LiturgySchema);
    const LiturgyDayModel = mongoose.model('LiturgyDay', LiturgyDaySchema);

    // 5) Save to database
        const savedReadings = await ReadingModel.insertMany(data.readings);
        const savedSaints = await SaintModel.insertMany(data.saints);
        const savedCommentary = await CommentaryModel.create(data.commentary);
        const savedLiturgy = await LiturgyModel.create(data.liturgy);

        let newLiturgyDay = new LiturgyDayModel(
            ...data
        );

        for (var saint of savedSaints) {
            newLiturgyDay.saints.push(saint);
        }
        for (var reading of savedReadings) {
            newLiturgyDay.readings.push(reading);
        }
        newLiturgyDay.liturgy = savedLiturgy;
        newLiturgyDay.commentary = savedCommentary;

        const savedLiturgyDay = await newLiturgyDay.save();

        logger.debug(savedLiturgyDay);

    } catch (error) {
        logger.error(error);
        throw error;
    }

    job.reportProgress(5);
    logger.info(`Completed job fetcher for ${lang}, ${date}`);
});