import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { GET } from './+server.js';
import { User } from '$lib/utils/mongodb.js';

vi.mock('$env/static/private', () => ({
  JWT_PASSWORD: 'test-secret-password'
}));

vi.mock('jsonwebtoken');

vi.mock('$lib/utils/mongodb.js', () => ({
  User: {
    findById: vi.fn()
  }
}));




describe('/api/confirm-email endpoint', () => {

  afterAll(() => {
    vi.resetModules();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('confirm the user email successfully', async () => {

    const mockUserSave = vi.fn();
    const mockUser = {
      _id: 'user123',
      isConfirmed: false,
      save: mockUserSave
    };
    vi.mocked(jwt.verify).mockReturnValue({ userId: 'user123' });
    User.findById.mockResolvedValue(mockUser);
    
    const url = new URL('http://localhost/api/confirm-email?token=valid-token');
    

    const response = await GET({ url });
    const body = await response.json();


    expect(response.status).toBe(200);
    expect(body.message).toBe('Email confirmed successfully.');
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-password');
    expect(User.findById).toHaveBeenCalledWith('user123');
    expect(mockUser.isConfirmed).toBe(true);
    expect(mockUserSave).toHaveBeenCalledTimes(1);
  });

  it('email is already confirmed', async () => {

    const mockUserSave = vi.fn();
    const mockUser = {
      _id: 'user123',
      isConfirmed: true, 
      save: mockUserSave
    };
    vi.mocked(jwt.verify).mockReturnValue({ userId: 'user123' });
    User.findById.mockResolvedValue(mockUser);

    const url = new URL('http://localhost/api/confirm-email?token=valid-token');

    // Act
    const response = await GET({ url });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.message).toBe('Email already confirmed.');
    expect(mockUserSave).not.toHaveBeenCalled();
  });

  it('token is missing ', async () => {
    // Arrange
    const url = new URL('http://localhost/api/confirm-email');

    // Act
    const response = await GET({ url });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('Token is required.');
  });
  
  it('invalid or expired token ', async () => {
    // Arrange
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('jwt malformed');
    });
    const url = new URL('http://localhost/api/confirm-email?token=invalid-token');

    // Act
    const response = await GET({ url });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid or expired token.');
  });

  it('user is not found ', async () => {
    // Arrange
    vi.mocked(jwt.verify).mockReturnValue({ userId: 'non-existent-user' });
    User.findById.mockResolvedValue(null);
    const url = new URL('http://localhost/api/confirm-email?token=valid-token-for-ghost-user');

    // Act
    const response = await GET({ url });
    const body = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(body.error).toBe('User not found.');
  });

  it('database error ', async () => {
    // Arrange
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(jwt.verify).mockReturnValue({ userId: 'user123' });
    User.findById.mockRejectedValue(new Error('DB connection failed'));
    const url = new URL('http://localhost/api/confirm-email?token=valid-token');


    const response = await GET({ url });
    const body = await response.json();


    expect(response.status).toBe(500);
    expect(body.error).toBe('An unexpected error occurred.');
  });
});