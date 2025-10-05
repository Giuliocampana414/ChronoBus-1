import jwt from 'jsonwebtoken';
import { JWT_PASSWORD } from '$env/static/private';
import { User } from '$lib/utils/mongodb.js';
import { json } from '@sveltejs/kit';

/**
 * Endpoint per confermare l'email dell'utente.
 */
export async function GET({ url }) {
    try {
        const token = url.searchParams.get('token');

        if (!token) {
            return json({ error: 'Token is required.' }, { status: 400 });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_PASSWORD);
        } catch (err) {
            return json({ error: 'Invalid or expired token.' }, { status: 400 });
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            return json({ error: 'User not found.' }, { status: 404 });
        }

        if (user.isConfirmed) {
            return json({ message: 'Email already confirmed.' }, { status: 200 });
        }

        user.isConfirmed = true;
        await user.save();

        return json({ message: 'Email confirmed successfully.' }, { status: 200 });

    } catch (err) {
        console.error("Unexpected error:", err);
        return json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}

