import { updateJobLog, jobStatus } from '../helpers';
import { JobFetchModel } from './helpers';
import { 
    LiturgyDayModel,
    ReadingModel,
    SaintModel,
    CommentaryModel,
    LiturgyModel
} from './model';
import axios from 'axios';

const checkPreviousRecords = async(date, lang, jobInstance) => {
    let shouldFetch = false;

    updateJobLog(
        jobInstance,
        jobStatus[1],
        1000,
        `Beginning check for ${date}, ${lang}`
    );

    let existingDoc = await LiturgyDayModel.findOne(
        { date: date, lang: lang }
    );

    if (existingDoc) {
        // Document exists, check content
        updateJobLog(
            jobInstance,
            jobStatus[1],
            1000,
            `Found existing document ${existingDoc.id}, checking content...`
        );

        let existingDocReadings = existingDoc.get('readings');
        if (existingDocReadings.length <= 0) {

            updateJobLog(
                jobInstance,
                jobStatus[1],
                1000,
                `Invalid content, removing ${existingDoc.id}...`
            );

            await LiturgyDayModel.deleteOne({ id: existingDoc.id });
            shouldFetch = true;

            updateJobLog(
                jobInstance,
                jobStatus[1],
                1000,
                `Document cleaned, ready for re-fetch.`
            );

        } else {
            updateJobLog(
                jobInstance,
                jobStatus[1],
                1000,
                `Valid content, skipping fetch...`
            );
        }
    } else {
        // Document does not exists, we need it
        shouldFetch = true;
    }

    updateJobLog(
        jobInstance,
        jobStatus[1],
        1000,
        `Completed check for ${date}, ${lang}`
    );

    return shouldFetch;
};

const fetchNewData = async(date, lang, jobInstance) => {
   updateJobLog(
        jobInstance,
        jobStatus[1],
        1100,
        `Beginning fetch data for ${date}, ${lang}`
    );

    const url = `https://publication.evangelizo.ws/${lang}/days/${date}`;
    let data = {};

    const response = await axios.get(url);
    data = response.data.data;
    data.lang = lang;

    updateJobLog(
        jobInstance,
        jobStatus[1],
        1100,
        `Completed fetch data for ${date}, ${lang}`
    );

    return data;
};

const saveNewData = async (data, jobInstance) => {
    updateJobLog(
        jobInstance,
        jobStatus[1],
        1200,
        `Beginning save data`
    );

    const savedReadings = await ReadingModel.insertMany(data.readings);
    updateJobLog(
        jobInstance,
        jobStatus[1],
        1200,
        `Insterted readings.`
    );

    let savedSaints = [];
    for (let saint of data.saints) {
        let savedSaint = await SaintModel.findOneAndUpdate(
            { id: saint.id },
            saint,
            {
                upsert: true,
                new: true
            }
        );
        savedSaints.push(savedSaint);
    }
    updateJobLog(
        jobInstance,
        jobStatus[1],
        1200,
        `Insterted saints.`
    );

    const savedCommentary = await CommentaryModel.create(data.commentary);
    updateJobLog(
        jobInstance,
        jobStatus[1],
        1200,
        `Inserted commentary...`
    );

    const savedLiturgy = await LiturgyModel.create(data.liturgy);
    updateJobLog(
        jobInstance,
        jobStatus[1],
        1200,
        `Inserted Liturgy...`
    );

    data.readings = [];
    data.saints = [];
    data.liturgy = {};
    data.commentary = {};

    let newLiturgyDay = new LiturgyDayModel(
        data
    );
    updateJobLog(
        jobInstance,
        jobStatus[1],
        1200,
        `Inserted additional data...`
    );

    for (var saint of savedSaints) {
        newLiturgyDay.saints.push(saint);
    }
    updateJobLog(
        jobInstance,
        jobStatus[1],
        1200,
        `Attached saints to day...`
    );

    for (var reading of savedReadings) {
        newLiturgyDay.readings.push(reading);
    }
    updateJobLog(
        jobInstance,
        jobStatus[1],
        1200,
        `Attached readings to day...`
    );

    newLiturgyDay.liturgy = savedLiturgy;
    updateJobLog(
        jobInstance,
        jobStatus[1],
        1200,
        `Attached liturgy to day...`
    );

    newLiturgyDay.commentary = savedCommentary;
    updateJobLog(
        jobInstance,
        jobStatus[1],
        1200,
        `Attached commentary to day...`
    );

    updateJobLog(
        jobInstance,
        jobStatus[1],
        1200,
        `Saving LiturgyDayModel.`
    );

    await newLiturgyDay.save();

    updateJobLog(
        jobInstance,
        jobStatus[1],
        1200,
        `Completed save data`
    );
};

export const doJob = async (jobData) => {

    // 0) Get parameters
    const lang = jobData.lang;
    const date = jobData.date;

    let jobInstance = await JobFetchModel.create({
        date: date,
        lang: lang
    });

    // Will happen async-ly
    updateJobLog(
        jobInstance,
        jobStatus[0], 0,
        `Starting job fetcher for ${date}, ${lang}`
    );

    // 1) Check if it exists
    updateJobLog(
        jobInstance,
        jobStatus[1],
        1000,
        `Checking if previous document exists for ${date}, ${lang}`
    );
    let shouldFetch = await checkPreviousRecords(date, lang, jobInstance);

    if (shouldFetch) {
        // 1.1 Fetch
        updateJobLog(
            jobInstance,
            jobStatus[1],
            1100,
            `No valid document found, fetching data for ${date}, ${lang}`
        );
        let data = await fetchNewData(date, lang, jobInstance);

        // 1.2 Save to DB
        updateJobLog(
            jobInstance,
            jobStatus[1],
            1200,
            `Saving data for ${date}, ${lang}`
        );
        await saveNewData(data, jobInstance);

    } else {
        // 1.0 Say there was no need to fetch
        updateJobLog(
            jobInstance,
            jobStatus[1],
            1000
            `Document exists with valid data for ${date}, ${lang}`
        )
    }

    // 2) We are done
    updateJobLog(
        jobInstance,
        jobStatus[2],
        2000,
        `Completed job fetcher for ${date}, ${lang}`
    )
    return true;
};