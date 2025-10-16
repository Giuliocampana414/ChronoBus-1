import jwt from 'jsonwebtoken';
import { JWT_PASSWORD } from '$env/static/private';
import { User } from '$lib/utils/mongodb.js';
import { json } from '@sveltejs/kit';


export async function DELETE({ request }) {
	try {
		const authHeader = request.headers.get('authorization');
		const token = authHeader && authHeader.split(' ')[1];

		if (!token) {
			return json({ error: 'Missing token' }, { status: 401 });
		}

		// Verifica il token JWT
		const decoded = jwt.verify(token, JWT_PASSWORD);

		if (!decoded?.userId) {
			return json({ error: 'Not valid token' }, { status: 403 });
		}

		// Elimina l'utente dal database usando Mongoose
		const result = await User.deleteOne({ userId: decoded.userId});

		if (result.deletedCount === 1) {
			return json({ message: 'Account successfully deleted' }, { status: 200 });
		} else {
			return json({ error: 'User not found' }, { status: 404 });
		}
	} catch (err) {
		console.error('Error deleting account:', err);
		return json({ error: 'Server error' }, { status: 500 });
	}
}
