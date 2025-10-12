import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from '$env/static/private';
import { User } from '$lib/utils/mongodb.js';
import { json } from '@sveltejs/kit';
import { validateToken } from '$lib/utils/auth.js';

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
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json(
        { error: 'Email and password required.' },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return json(
        { error: 'Account already exists with this email.' },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ email, password: hashed });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email, isAdmin: user.isAdmin },
      JWT_PASSWORD,
      { expiresIn: "30d" }
    );

    return json(
      { message: 'Registration successful', token },
      { status: 201 }
    );
  } catch (err) {
    console.error('Registration error:', err);
    return json(
      { error: 'Server error' },
      { status: 500 }
    );
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