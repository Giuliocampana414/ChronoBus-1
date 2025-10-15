import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, OPTIONS } from './+server.js';


vi.mock('$env/static/private', () => ({
  JWT_PASSWORD: 'test-secret-password',
  ALLOWED_ORIGIN: 'http://localhost:5173'
}));

vi.mock('$env/static/public', () => ({
  PUBLIC_GOOGLE_CLIENT_ID: 'test-google-client-id'
}));

const { mockVerifyIdToken } = vi.hoisted(() => {
  return { mockVerifyIdToken: vi.fn() };
});

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn(() => ({
    verifyIdToken: mockVerifyIdToken
  }))
}));

const { MockUser, mockUserFindOne, mockUserSave } = vi.hoisted(() => {
  const mockSaveFn = vi.fn();
  const mockFindOneFn = vi.fn();
  

  const MockUserClass = vi.fn((constructorArgs) => ({
    ...constructorArgs,
    save: mockSaveFn
  }));
  MockUserClass.findOne = mockFindOneFn;
  
  return { 
    MockUser: MockUserClass,
    mockUserFindOne: mockFindOneFn, 
    mockUserSave: mockSaveFn
  };
});

vi.mock('$lib/utils/mongodb.js', () => ({
  User: MockUser
}));


describe('/api/google-login endpoint', () => {


  const createMockRequest = (body) => {
    return new Request('http://localhost/api/google-login', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('OPTIONS should return 204 with correct CORS headers', () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
  });

  describe('POST - Success Scenarios', () => {
    it('log in an existing user and return a JWT', async () => {

      const mockExistingUser = {
        _id: '12345',
        email: 'test@example.com',
        isAdmin: false,
      };
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ email: 'test@example.com' }) });
      mockUserFindOne.mockResolvedValue(mockExistingUser);
      
      const request = createMockRequest({ token: 'valid-google-token' });
      
      const response = await POST({ request });
      const body = await response.json();
      
      expect(response.status).toBe(200);
      expect(body.message).toBe('Logged in with Google');
      expect(body.email).toBe('test@example.com');
      expect(mockUserFindOne).toHaveBeenCalledWith({ email: 'test@example.com' });
      expect(MockUser).not.toHaveBeenCalled(); // Il costruttore non viene chiamato
      expect(mockUserSave).not.toHaveBeenCalled();
    });

    it('create a new user if not found and return a JWT', async () => {

      mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ email: 'newuser@example.com' }) });
      mockUserFindOne.mockResolvedValue(null); // L'utente non esiste
      
      const request = createMockRequest({ token: 'valid-google-token-for-new-user' });


      const response = await POST({ request });
      const body = await response.json();


      expect(response.status).toBe(200);
      expect(body.email).toBe('newuser@example.com');
      
      expect(mockUserFindOne).toHaveBeenCalledWith({ email: 'newuser@example.com' });
      expect(MockUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: "null",
        isAdmin: false,
        isGoogleAuthenticated: true
      });
      expect(mockUserSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST - Failure Scenarios', () => {
    it('Google token is missing', async () => {
      const request = createMockRequest({}); // Corpo vuoto
      const response = await POST({ request });
      const body = await response.json();
      
      expect(response.status).toBe(400);
      expect(body.error).toBe('Google token missing');
    });

    it('Google token is invalid (no email in payload)', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({}) });
      const request = createMockRequest({ token: 'valid-token-no-email' });
      const response = await POST({ request });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid Google token');
    });

    it('Google token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token signature'));
      const request = createMockRequest({ token: 'invalid-signature-token' });
      const response = await POST({ request });
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to authenticate with Google');
    });

    it('database operation fails', async () => {
      mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ email: 'test@example.com' }) });
      mockUserFindOne.mockRejectedValue(new Error('DB connection failed'));
      const request = createMockRequest({ token: 'valid-token' });
      const response = await POST({ request });
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error).toBe('Failed to authenticate with Google');
    });
  });
});