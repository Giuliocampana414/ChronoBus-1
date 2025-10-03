import jwt from 'jsonwebtoken';
import { JWT_PASSWORD } from '$env/static/private';
import { User } from '$lib/utils/mongodb.js';
import { json } from '@sveltejs/kit';


export async function DELETE({ request }) {
	try {
		const authHeader = request.headers.get('authorization');
		const token = authHeader && authHeader.split(' ')[1];

		if (!token) {
			return json({ error: 'Token mancante' }, { status: 401 });
		}

		// Verifica il token JWT
		const decoded = jwt.verify(token, JWT_PASSWORD);

		if (!decoded?.id) {
			return json({ error: 'Token non valido' }, { status: 403 });
		}

		// Elimina l'utente dal database usando Mongoose
		const result = await User.deleteOne({ _id: decoded.id });

		if (result.deletedCount === 1) {
			return json({ message: 'Account eliminato con successo' }, { status: 200 });
		} else {
			return json({ error: 'Utente non trovato' }, { status: 404 });
		}
	} catch (err) {
		console.error('Errore durante l’eliminazione dell’account:', err);
		return json({ error: 'Errore del server' }, { status: 500 });
	}
}
