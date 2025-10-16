import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from '$env/static/private';
import { mongoose, User } from '$lib/utils/mongodb.js';
import { json } from '@sveltejs/kit';
import { isAdmin } from '$lib/stores/admin';
import { EMAIL,EMAIL_PASSWORD } from '$env/static/private';
/**
 * Gestisce il login di un utente tramite richiesta POST.
 *
 * Endpoint per il login che:
 * - accetta un oggetto JSON con email e password,
 * - verifica la presenza dei dati obbligatori,
 * - controlla se l'email corrisponde a un utente esistente,
 * - confronta la password fornita con quella salvata (hash),
 * - se la combinazione è valida, restituisce un token JWT di autenticazione,
 * - in caso di dati non validi, restituisce un messaggio di errore.
 *
 * @async
 * @function POST
 * @param {Object} context - Oggetto contenente i dati della richiesta.
 * @param {Request} context.request - Oggetto Request con il body JSON { email, password }.
 * @returns {Promise<Response>} Response HTTP che può essere:
 *   - 201: Login avvenuto con successo, token JWT restituito.
 *   - 400: Email o password mancanti.
 *   - 409: Email non trovata nel database.
 *   - 500: Errore interno del server.
 */
export async function POST({ request }) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return json(
                { error: 'Email and password required.' },
                { status: 400 }
            );
        }

        const existing = await User.findOne({ email });
        if (!existing) {
            return json(
                { error: 'Email not found.' },
                { status: 409 }
            );
        }
        let user = await User.findOne({ email });
        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return json(
                { error: 'Invalid password.' },
                { status: 401 }
            );
        }
        const token = jwt.sign(
            { userId: user._id, email: user.email, isAdmin: user.isAdmin },
            JWT_PASSWORD,
            { expiresIn: "30d" }
        );
        return json(
            { message: 'Login successful', token, isAdmin: user.isAdmin },
            { status: 201 }
        );

    } catch (err) {
        return json(
            { error: 'Server error.' },
            { status: 500 }
        );
    }
}

