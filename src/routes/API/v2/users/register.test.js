import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// 1. RIMUOVI nodemailer e importa Resend
import { Resend } from 'resend';
import { POST } from './+server.js';

// --- Mocks ---
const mockUserFindOne = vi.fn();
const mockUserSave = vi.fn();
const mockUserConstructor = vi.fn();
// 2. CREA un mock per la funzione di invio di Resend
const mockResendSend = vi.fn();

vi.mock('bcryptjs');
vi.mock('jsonwebtoken');

// 3. SOSTITUISCI il mock di Nodemailer con quello di Resend
vi.mock('resend', () => ({
  // Mock della classe Resend e della sua implementazione
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockResendSend // Usa la nostra funzione mock per il metodo .send()
    }
  }))
}));

// Il mock del database non cambia
vi.mock('$lib/models/User', async (importOriginal) => {
  const actual = await importOriginal();
  const User = vi.fn((...args) => mockUserConstructor(...args));
  User.findOne = mockUserFindOne;
  return { ...actual, default: User };
});

const { default: User } = await import('$lib/models/User');

// 4. AGGIORNA il mock delle variabili d'ambiente
vi.mock('$env/static/private', () => ({
  JWT_PASSWORD: 'test-jwt-secret',
  RESEND_API_KEY: 'test-resend-api-key' // Aggiungi la nuova variabile
}));

describe('POST /API/v2/users', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a new user, sends a confirmation email, and returns a token', async () => {
    mockUserFindOne.mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
    // 5. IMPOSTA il mock di Resend per avere successo
    mockResendSend.mockResolvedValue({ id: 'resend-email-id' });

    const savedUser = { _id: 'user-id-123', email: 'newuser@example.com', isAdmin: false };
    const userInstance = { ...savedUser, save: mockUserSave.mockResolvedValue(savedUser) };
    mockUserConstructor.mockReturnValue(userInstance);

    vi.mocked(jwt.sign)
      .mockReturnValueOnce('email-confirmation-token')
      .mockReturnValueOnce('auth-login-token');

    const request = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'newuser@example.com', password: 'password123' })
    });

    const response = await POST({ request });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.message).toBe('Registration successful. Please check your email to confirm.');
    expect(body.token).toBe('auth-login-token');

    expect(mockUserFindOne).toHaveBeenCalledWith({ email: 'newuser@example.com' });
    expect(mockUserSave).toHaveBeenCalledTimes(1);
    
    // 6. AGGIORNA le asserzioni per controllare la chiamata a Resend
    expect(mockResendSend).toHaveBeenCalledTimes(1);
    const resendOptions = mockResendSend.mock.calls[0][0];
    expect(resendOptions.to).toEqual(['newuser@example.com']); // Resend usa un array per 'to'
    expect(resendOptions.from).toBe('ChronoBus <onboarding@resend.dev>');
    expect(resendOptions.subject).toBe('Please confirm your email');
    expect(resendOptions.html).toContain('http://localhost:5173/validation-email?token=email-confirmation-token');
  });

  it('returns an error if the email already exists', async () => {
    mockUserFindOne.mockResolvedValue({ email: 'existing@example.com' });
    const request = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'existing@example.com', password: 'password123' })
    });

    const response = await POST({ request });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('Account already exists with this email.');
    // Assicurati che l'email non venga inviata
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('returns an error if email or password are not provided', async () => {
    const request = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' /* password mancante */ })
    });

    const response = await POST({ request });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Email and password required.');
  });

  it('returns a server error if sending the email fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUserFindOne.mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
    // 7. Fai fallire il mock di Resend
    mockResendSend.mockRejectedValue(new Error('Resend API connection failed'));

    const savedUser = { _id: 'user-id-123', email: 'newuser@example.com', isAdmin: false };
    const userInstance = { ...savedUser, save: mockUserSave.mockResolvedValue(savedUser) };
    mockUserConstructor.mockReturnValue(userInstance);
    vi.mocked(jwt.sign).mockReturnValue('any-token');

    const request = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'newuser@example.com', password: 'password123' })
    });

    const response = await POST({ request });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Server error');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('returns a server error if saving the user fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUserFindOne.mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
    mockUserSave.mockRejectedValue(new Error('Database write error'));

    const userInstance = { save: mockUserSave };
    mockUserConstructor.mockReturnValue(userInstance);

    const request = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'newuser@example.com', password: 'password123' })
    });

    const response = await POST({ request });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Server error');
    expect(consoleErrorSpy).toHaveBeenCalled();
    // Assicurati che l'email non venga inviata se il salvataggio fallisce
    expect(mockResendSend).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});