import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { JWT_PASSWORD } from '$env/static/private';
import { User,mongoose } from '$lib/utils/mongodb.js';
import { json } from '@sveltejs/kit';
import { PUBLIC_GOOGLE_CLIENT_ID } from '$env/static/private';
import { ALLOWED_ORIGIN } from '$env/static/private';

// Inizializza il client Google
const client = new OAuth2Client(PUBLIC_GOOGLE_CLIENT_ID);

// CORS headers da includere in ogni risposta
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': "http://localhost:5173",
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Risposta alla richiesta preflight OPTIONS
export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}

// Gestione POST: verifica ID token Google e restituisce un JWT
export async function POST({ request }) {
  try {
    const { token } = await request.json();

    if (!token) {
      return json({ error: 'Google token missing' }, {
        status: 400,
        headers: CORS_HEADERS
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: PUBLIC_GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload?.email;

    if (!email) {
      return json({ error: 'Invalid Google token' }, {
        status: 400,
        headers: CORS_HEADERS
      });
    }

    // Trova o crea l'utente
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        password: "null",
        isAdmin: false,
        isGoogleAuthenticated: true
      });
      await user.save();
    }

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, isAdmin: user.isAdmin },
      JWT_PASSWORD,
      { expiresIn: '30d' }
    );

    return json({
      message: 'Logged in with Google',
      isAdmin: user.isAdmin,
      email: user.email,
      token: jwtToken,
      idToken: token
    }, {
      status: 200,
      headers: CORS_HEADERS
    });

  } catch (err) {
    console.error('Google Login Error:', err.message);
    return json({ error: 'Failed to authenticate with Google' }, {
      status: 500,
      headers: CORS_HEADERS
    });
  }
}