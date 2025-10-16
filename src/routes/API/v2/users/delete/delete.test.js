import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from './+server.js'; 
import jwt from 'jsonwebtoken';
import { User } from '$lib/utils/mongodb.js';


vi.mock('jsonwebtoken');
vi.mock('$lib/utils/mongodb.js');

vi.mock('$env/static/private', () => ({
    JWT_PASSWORD: 'una-password-segreta-per-il-test',
    MONGO_URI: 'mongodb://localhost:27017/test-db-fittizia'
}));

describe('DELETE /account', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockUserId = 'user123';
    const mockToken = 'un-token-fittizio';

    it('dovrebbe eliminare un utente con un token valido e restituire 200 OK', async () => {
        // Arrange
        const mockRequest = {
            headers: new Map([
                ['authorization', `Bearer ${mockToken}`]
            ])
        };

        vi.mocked(jwt.verify).mockReturnValue({ userId: mockUserId });
        vi.mocked(User.deleteOne).mockResolvedValue({ deletedCount: 1 });

        // Act
        const response = await DELETE({ request: mockRequest });
        const body = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(body.message).toBe('Account successfully deleted');
        expect(jwt.verify).toHaveBeenCalledWith(mockToken, 'una-password-segreta-per-il-test');
        expect(User.deleteOne).toHaveBeenCalledWith({ userId: mockUserId });
    });

    it('dovrebbe restituire 401 se manca il token', async () => {
        // Arrange
        const mockRequest = {
            headers: new Map()
        };

        // Act
        const response = await DELETE({ request: mockRequest });
        const body = await response.json();

        // Assert
        expect(response.status).toBe(401);
        expect(body.error).toBe('Missing token');
        expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('dovrebbe restituire 403 se il token è valido ma non contiene userId', async () => {
        // Arrange
        const mockRequest = {
            headers: new Map([
                ['authorization', `Bearer ${mockToken}`]
            ])
        };
        vi.mocked(jwt.verify).mockReturnValue({ someOtherData: 'value' });

        // Act
        const response = await DELETE({ request: mockRequest });
        const body = await response.json();

        // Assert
        expect(response.status).toBe(403);
        expect(body.error).toBe('Not valid token');
    });

    it('dovrebbe restituire 404 se il token è valido ma l\'utente non viene trovato', async () => {
        // Arrange
        const mockRequest = {
            headers: new Map([
                ['authorization', `Bearer ${mockToken}`]
            ])
        };
        vi.mocked(jwt.verify).mockReturnValue({ userId: mockUserId });
        vi.mocked(User.deleteOne).mockResolvedValue({ deletedCount: 0 });

        // Act
        const response = await DELETE({ request: mockRequest });
        const body = await response.json();

        // Assert
        expect(response.status).toBe(404);
        expect(body.error).toBe('User not found');
    });
    
    it('dovrebbe restituire 500 se la verifica del token fallisce (es. token scaduto)', async () => {
        // Arrange
        const mockRequest = {
            headers: new Map([
                ['authorization', `Bearer ${mockToken}`]
            ])
        };
        vi.mocked(jwt.verify).mockImplementation(() => {
            throw new Error('Invalid signature');
        });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Act
        const response = await DELETE({ request: mockRequest });
        const body = await response.json();

        // Assert
        expect(response.status).toBe(500);
        expect(body.error).toBe('Server error');
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});