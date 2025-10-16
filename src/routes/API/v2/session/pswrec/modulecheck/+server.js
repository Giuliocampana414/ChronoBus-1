import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_PASSWORD } from '$env/static/private';
import { mongoose, User } from '$lib/utils/mongodb.js';
import { json } from '@sveltejs/kit';
import { isAdmin } from '$lib/stores/admin';


/**
 * Gestisce il cambio password di un utente che ha dimenticato la password tramite richiesta POST.
 *
 * Endpoint per il cambio password che:
 * - accetta un oggetto JSON con email, codice e nuova password,
 * - verifica la presenza dei dati obbligatori,
 * - controlla se l'email corrisponde a un utente esistente,
 * - confronta il codice con quello salvato nel database,
 * - se la combinazione è valida, cambia la password con quella nuova,
 * - in caso di dati non validi, restituisce un messaggio di errore.
 *
 * @async
 * @function POST
 * @param {Object} context - Oggetto contenente i dati della richiesta.
 * @param {Request} context.request - Oggetto Request con il body JSON { email, password }.
 * @returns {Promise<Response>} Response HTTP che può essere:
 *   - 201: Password cambiata con successo.
 *   - 400: Email, codice o password mancanti.
 * 	 - 401: Il codice non è corretto.
 *   - 409: Email non trovata nel database.
 *   - 500: Errore interno del server.
 */
export async function POST({ request }) {
	try {
		const { email, codice, password } = await request.json();

		if (!email || !codice || !password ) {
			return json({ error: 'Email, code or password required.' }, { status: 400 });
		}

		const existing = await User.findOne({ email });
		if (!existing) {
			return json({ error: 'Email not found.' }, { status: 409 });
		}
		let user = await User.findOne({ email });

		const valid = await bcrypt.compare(codice, user.rec_code);
		if(!valid){
			return json({ error: 'Code not correct.' }, { status: 401 });
		}
		user.rec_code = " ";
		user.password= await bcrypt.hash(password, 10);
		await user.save();

		  return json({ message: 'Password aggiornata.' }, {status: 201});
	} catch (err) {
		return json({ error: 'Server error. '+ err }, { status: 500 });
	}
}
