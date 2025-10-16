import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from '$env/static/private';
import { User } from '$lib/utils/mongodb.js';
import { json, redirect } from '@sveltejs/kit';
import { validateToken } from '$lib/utils/auth.js';
import { EMAIL,EMAIL_PASSWORD} from '$env/static/private';
import nodemailer from 'nodemailer';

/**
 * Gestisce la registrazione di un nuovo utente tramite richiesta POST.
 *
 * Endpoint per la registrazione che:
 * - accetta un oggetto JSON con email e password,
 * - verifica la validità dei dati inseriti,
 * - verifica che l'email non sia già registrata,
 * - cripta la password,
 * - salva il nuovo utente nel database,
 * - genera un token JWT per l'autenticazione,
 * - restituisce la risposta appropriata in base al risultato.
 *
 * @async
 * @function POST
 * @param {Object} context - L'oggetto contesto fornito dal framework ({ request }).
 * @param {Request} context.request - Oggetto Request contenente i dati della richiesta (body JSON: { email, password }).
 * @returns {Promise<Response>} Response HTTP con codice di stato e messaggio risultante:
 *   - 201: Registrazione avvenuta con successo, restituisce il token JWT.
 *   - 400: Email o password mancanti.
 *   - 409: Account già esistente con la stessa email.
 *   - 500: Errore interno del server.
*/
export async function POST({ request }) {
  // 1. Log di inizio. Se non vedi questo, l'endpoint non viene nemmeno raggiunto.
  console.log('[DEBUG] Richiesta di registrazione ricevuta.');

  try {
    const { email, password } = await request.json();
    console.log(`[DEBUG] Dati ricevuti per: ${email}`);

    if (!email || !password) {
      console.error('[DEBUG] Errore: Email o password mancanti.');
      return json({ error: 'Email and password required.' }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.warn(`[DEBUG] Tentativo di registrazione per email già esistente: ${email}`);
      return json({ error: 'Account already exists with this email.' }, { status: 409 });
    }

    console.log('[DEBUG] Hashing della password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('[DEBUG] Creazione nuovo utente nel database...');
    const user = new User({ email, password: hashedPassword, isConfirmed: false });
    await user.save();
    console.log(`[DEBUG] Utente creato con successo con ID: ${user._id}`);

    // --- SEZIONE EMAIL ---
    console.log('[DEBUG] Inizio preparazione invio email...');
    const confirmToken = jwt.sign({ userId: user._id }, JWT_PASSWORD, { expiresIn: '3h' });
    const confirmUrl = `https://chronobus-1.onrender.com/validation-email?token=${confirmToken}`;

    console.log('[DEBUG] Creazione transporter Nodemailer...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL,
        pass: EMAIL_PASSWORD, // Deve essere la Password per le App di 16 cifre
      },
    });

    console.log('[DEBUG] Opzioni email preparate. Sto per inviare...');
    await transporter.sendMail({
      from: EMAIL,
      to: email,
      subject: 'Please confirm your email',
      html: `<p>Click here to confirm: <a href="${confirmUrl}">Confirm</a></p>`,
    });
    console.log(`[DEBUG] Email inviata con successo a ${email}`);
    // --- FINE SEZIONE EMAIL ---

    const token = jwt.sign({ userId: user._id, email: user.email, isAdmin: user.isAdmin }, JWT_PASSWORD, { expiresIn: "30d" });

    return json({ message: 'Registration successful. Please check your email.', token }, { status: 201 });

  } catch (err) {
    // 2. Log dell'errore DETTAGLIATO. Questo è il log più importante.
    console.error('--- ERRORE NEL BLOCCO CATCH ---');
    console.error('TIPO DI ERRORE:', typeof err);
    console.error('MESSAGGIO DI ERRORE:', err.message);
    console.error('STACK TRACE:', err.stack);
    console.error('ERRORE COMPLETO:', JSON.stringify(err, null, 2));
    console.error('--- FINE ERRORE ---');

    return json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET({ request }) {
  const { valid, payload, error } = validateToken(request);

  if (!valid) {
    return json({ error }, { status: 401 });
  }
  if (!payload.isAdmin) {
    return json({ error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const users = await User.find().lean();
    return json(users, { status: 200 });
  } catch (err) {
    console.error('Error fetching user:', err);
    return json({ error: 'Server error' }, { status: 500 });
  }
}