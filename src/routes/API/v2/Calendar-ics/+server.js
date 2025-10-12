import ical from 'ical.js';
import { json } from '@sveltejs/kit';

/**
 * Gestisce le richieste POST all'endpoint /Calendar-ics.
 * Si aspetta di ricevere il contenuto di un file .ics nel corpo della richiesta.
 * @param {Request} request
 */
export async function POST({ request }) {
    try {
        const icsContent = await request.text();

        if (!icsContent) {

            return json({ error: 'Corpo della richiesta vuoto. Inviare il contenuto del file .ics.' }, { status: 400 });
        }

        // 2. Esegue il parsing del contenuto usando ical.js
        const jcalData = ical.parse(icsContent);
        const vcalendar = new ical.Component(jcalData);
        const vevents = vcalendar.getAllSubcomponents('vevent');


        const formattedEvents = vevents.map((vevent) => {
            const event = new ical.Event(vevent);
            return {
                uid: event.uid,
                title: event.summary,
                start: event.startDate.toJSDate(),
                end: event.endDate.toJSDate(),
                location: event.location,
                description: event.description
            };
        });

        return json({
            success: true,
            eventCount: formattedEvents.length,
            events: formattedEvents
        }, { status: 200 });

    }  catch (error) {
    console.error("ERRORE DETTAGLIATO DAL PARSER SUL SERVER:", error);

    return json({
        success: false,
        error: 'Errore nel parsing del file. Assicurati che il formato sia corretto.'
    }, { status: 500 });
}
}