import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { POST } from './+server.js';



const mockUserFindOne = vi.fn();
const mockUserSave = vi.fn();
const mockUserConstructor = vi.fn();
const mockSendMail = vi.fn(); 


vi.mock('bcryptjs');
vi.mock('jsonwebtoken');


vi.mock('nodemailer', () => ({
    default: {
      createTransport: vi.fn(() => ({
        sendMail: (...args) => mockSendMail(...args)
      }))
    }
}));


vi.mock('$lib/utils/mongodb.js', () => ({
  User: vi.fn((...args) => mockUserConstructor(...args))
}));

const { User } = await import('$lib/utils/mongodb.js');
vi.mocked(User).findOne = mockUserFindOne;


vi.mock('$env/static/private', () => ({
  JWT_PASSWORD: 'test-jwt-secret',
  EMAIL: 'test-from@example.com',
  EMAIL_PASSWORD: 'test-email-password'
}));


describe('POST /api/register', () => {

  beforeEach(() => {
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });


  it('register a new user, send a confirmation email, and return a token', async () => {
 
    mockUserFindOne.mockResolvedValue(null); 
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
    mockSendMail.mockResolvedValue(true); 

    const savedUser = {
      _id: 'user-id-123',
      email: 'newuser@example.com',
      isAdmin: false
    };
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
    expect(mockUserConstructor).toHaveBeenCalledWith({ email: 'newuser@example.com', password: 'hashed-password', isConfirmed: false });
    expect(mockUserSave).toHaveBeenCalledTimes(1);


    expect(jwt.sign).toHaveBeenCalledTimes(2);
    expect(jwt.sign).toHaveBeenCalledWith({ userId: savedUser._id }, 'test-jwt-secret', { expiresIn: '3h' });
    expect(jwt.sign).toHaveBeenCalledWith({ userId: savedUser._id, email: savedUser.email, isAdmin: savedUser.isAdmin }, 'test-jwt-secret', { expiresIn: '30d' });
    

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailOptions = vi.mocked(mockSendMail).mock.calls[0][0]; 
    expect(mailOptions.to).toBe('newuser@example.com');
    expect(mailOptions.subject).toBe('Please confirm your email');
    expect(mailOptions.html).toContain('http://localhost:5173/validation-email?token=email-confirmation-token');
  });

  it('email already exists', async () => {

    mockUserFindOne.mockResolvedValue({ email: 'existing@example.com' }); 
    const request = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'existing@example.com', password: 'password123' })
    });


    const response = await POST({ request });
    const body = await response.json();


    expect(response.status).toBe(409);
    expect(body.error).toBe('Account already exists with this email.');
    expect(mockSendMail).not.toHaveBeenCalled(); // L'email non deve essere inviata
  });

  it('email or password are not provided', async () => {
    // Arrange
    const request = new Request('http://localhost/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' /* password mancante */ })
    });


    const response = await POST({ request });
    const body = await response.json();


    expect(response.status).toBe(400);
    expect(body.error).toBe('Email and password required.');
  });
  
  it('sending the email fails', async () => {

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUserFindOne.mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
    mockSendMail.mockRejectedValue(new Error('SMTP connection failed')); 

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
  });
  
  it('user fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUserFindOne.mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password');
    mockUserSave.mockRejectedValue(new Error('Database write error')); // Salvataggio fallisce

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
    expect(mockSendMail).not.toHaveBeenCalled(); 
  });
});