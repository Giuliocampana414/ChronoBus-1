import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { POST } from './+server.js';
import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs'; 
import jwt from 'jsonwebtoken';

vi.mock('resend');
import { Resend } from 'resend';

const mockUserInstance = {
  _id: 'mock-user-id-123',
  email: 'test@example.com',
  password: 'hashed-password',
  isAdmin: false,
  isConfirmed: false,
  save: vi.fn().mockResolvedValue(true),
};
vi.mock('$lib/utils/mongodb.js', () => {
  const User = vi.fn().mockImplementation(() => mockUserInstance);
  User.findOne = vi.fn();
  return { User };
});
import { User } from '$lib/utils/mongodb.js';

vi.mock('bcryptjs'); 
vi.mock('jsonwebtoken');
vi.mock('$env/static/private', () => ({
  JWT_PASSWORD: 'test-secret',
  RESEND_API_KEY: 'test-resend-key',
}));
vi.mock('@sveltejs/kit', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        json: vi.fn((data, init) => ({ data, init, status: init?.status ?? 200 })),
    };
});
vi.spyOn(console, 'error').mockImplementation(() => {});



describe('User Registration Endpoint', () => {
  
  let mockResendSend;

  beforeEach(() => {
    vi.clearAllMocks();

    mockResendSend = vi.fn().mockResolvedValue({ id: 'resend-email-id' });
    
   
    vi.mocked(Resend).mockImplementation(() => ({
      emails: {
        send: mockResendSend,
      },
    }));

    bcrypt.hash.mockResolvedValue('hashed-password');
    vi.mocked(jwt.sign)
      .mockReturnValueOnce('confirm-token-xyz') 
      .mockReturnValueOnce('auth-token-abc');   
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });


  it('Deve registrare un nuovo utente, inviare l\'email di conferma e restituire un token', async () => {
    User.findOne.mockResolvedValue(null);
    const request = new Request('http://localhost/api/v2/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'newuser@example.com', password: 'password123' }),
    });
    const response = await POST({ request });
    expect(User.findOne).toHaveBeenCalledWith({ email: 'newuser@example.com' });
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(mockUserInstance.save).toHaveBeenCalled();
    expect(jwt.sign).toHaveBeenCalledTimes(2);
    expect(jwt.sign).toHaveBeenNthCalledWith(1,{ userId: mockUserInstance._id }, 'test-secret', { expiresIn: '3h' });
    expect(jwt.sign).toHaveBeenNthCalledWith(2,{ userId: mockUserInstance._id, email: mockUserInstance.email, isAdmin: mockUserInstance.isAdmin }, 'test-secret', { expiresIn: '30d' });
    expect(mockResendSend).toHaveBeenCalledWith({
      from: expect.any(String),
      to: ['newuser@example.com'],
      subject: 'Please confirm your email',
      html: expect.stringContaining('href="http://localhost:5173/validation-email?token=confirm-token-xyz"')
    });
    expect(response.status).toBe(201);
    expect(response.data).toEqual({
      message: 'Registration successful. Please check your email to confirm.',
      token: 'auth-token-abc'
    });
  });

  it('Deve restituire un errore se l\'email esiste già', async () => {
    User.findOne.mockResolvedValue({ email: 'existing@example.com' });
    const request = new Request('http://localhost/api/v2/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'existing@example.com', password: 'password123' }),
    });
    const response = await POST({ request });
    expect(response.status).toBe(409);
    expect(response.data).toEqual({ error: 'Account already exists with this email.' });
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it.each([
    { body: { email: 'test@example.com' }, description: 'password mancante' },
    { body: { password: 'password123' }, description: 'email mancante' },
    { body: {}, description: 'email e password mancanti' }
  ])('Deve restituire un errore se manca la $description', async ({ body }) => {
    const request = new Request('http://localhost/api/v2/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const response = await POST({ request });
    expect(response.status).toBe(400);
    expect(response.data).toEqual({ error: 'Email and password required.' });
  });

  it('Deve restituire un errore del server se il salvataggio nel DB fallisce', async () => {
    User.findOne.mockResolvedValue(null);
    mockUserInstance.save.mockRejectedValue(new Error('Database connection error'));
    const request = new Request('http://localhost/api/v2/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'fail@example.com', password: 'password123' }),
    });
    const response = await POST({ request });
    expect(response.status).toBe(500);
    expect(response.data).toEqual({ error: 'Server error' });
    expect(console.error).toHaveBeenCalled();
  });
});