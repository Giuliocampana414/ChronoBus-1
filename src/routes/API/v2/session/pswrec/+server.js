import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { EMAIL_PASSWORD } from '$env/static/private';
import { EMAIL } from '$env/static/private';
import { mongoose, User } from '$lib/utils/mongodb.js';
import { json } from '@sveltejs/kit';
import { isAdmin } from '$lib/stores/admin';

/**
 * Gestisce l'invio del codice per il cambio password via email tramite richiesta POST.
 *
 * Endpoint per il cambio password che:
 * - accetta un oggetto JSON con email,
 * - verifica la presenza dei dati obbligatori,
 * - controlla se l'email corrisponde a un utente esistente,
 * - in caso di dati non validi, restituisce un messaggio di errore.
 *
 * @async
 * @function POST
 * @param {Object} context - Oggetto contenente i dati della richiesta.
 * @param {Request} context.request - Oggetto Request con il body JSON { email, password }.
 * @returns {Promise<Response>} Response HTTP che può essere:
 *   - 201: Email inviata con successo.
 *   - 400: Email mancante.
 *   - 409: Email non trovata nel database.
 *   - 500: Errore interno del server.
 */
export async function POST({ request }) {
	try {
		const { email } = await request.json();

		if (!email ) {
			return json({ error: 'Email required.' }, { status: 400 });
		}

		const existing = await User.findOne({ email });
		if (!existing) {
			return json({ error: 'Email not found.' }, { status: 409 });
		}
		let user = await User.findOne({ email });

		const code = Math.floor(100000 + Math.random() * 900000).toString();

		const transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
			  user:  EMAIL,
			  pass:  EMAIL_PASSWORD,
			},
		  });
		  const mailOptions = {
			from: EMAIL,
			to: email,
			subject: 'Codice cambio password - ChronoBus',
			text: 'Ecco il tuo codice ' + code,
		  };

			user.rec_code = await bcrypt.hash(code, 10);;
			await user.save();


		  transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
			  return console.log('Errore:', error);
			}
			console.log('Email inviata:', info.response);
		  });

		  return json({ message: 'Codice inviato via mail.' }, {status:201});
	} catch (err) {
		return json({ error: 'Server error. '+ err }, { status: 500 });
	}
}
