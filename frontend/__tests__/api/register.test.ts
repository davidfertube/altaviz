/**
 * Tests for POST /api/auth/register route.
 */

import { NextRequest } from 'next/server';

const mockQuery = jest.fn();
const mockHash = jest.fn();

jest.mock('../../src/lib/db', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

jest.mock('bcryptjs', () => ({
  hash: (...args: any[]) => mockHash(...args),
}));

jest.mock('../../src/lib/errors', () => ({
  handleApiError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }),
}));

import { POST } from '../../src/app/api/auth/register/route';

function makeRequest(body: object) {
  return new NextRequest('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHash.mockResolvedValue('hashed_password_123');
  });

  it('returns 400 when email is missing', async () => {
    const response = await POST(makeRequest({ password: 'password123' }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Email and password are required');
  });

  it('returns 400 when password is missing', async () => {
    const response = await POST(makeRequest({ email: 'test@example.com' }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Email and password are required');
  });

  it('returns 400 for invalid email format', async () => {
    const response = await POST(makeRequest({ email: 'not-an-email', password: 'password123' }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Invalid email address');
  });

  it('returns 400 when password is too short', async () => {
    const response = await POST(makeRequest({ email: 'test@example.com', password: 'short' }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('Password must be at least 8 characters');
  });

  it('returns 409 when email already exists', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 'existing-user' }]);

    const response = await POST(makeRequest({ email: 'test@example.com', password: 'password123' }));
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toBe('An account with this email already exists');
  });

  it('successfully registers a new user with company name', async () => {
    mockQuery
      .mockResolvedValueOnce([])  // no existing user
      .mockResolvedValueOnce([{ id: 'new-org' }])  // org insert
      .mockResolvedValueOnce(undefined);  // user insert

    const response = await POST(makeRequest({
      email: 'New@Example.com',
      password: 'password123',
      name: 'John Doe',
      company: 'Acme Corp',
    }));
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.success).toBe(true);

    // Check email was lowercased
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id FROM users'),
      ['new@example.com']
    );

    // Check org was created with company name
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO organizations'),
      expect.arrayContaining(['Acme Corp'])
    );

    // Check password was hashed
    expect(mockHash).toHaveBeenCalledWith('password123', 12);
  });

  it('generates org name from user name when no company provided', async () => {
    mockQuery
      .mockResolvedValueOnce([])  // no existing user
      .mockResolvedValueOnce([{ id: 'new-org' }])  // org insert
      .mockResolvedValueOnce(undefined);  // user insert

    const response = await POST(makeRequest({
      email: 'jane@example.com',
      password: 'password123',
      name: 'Jane',
    }));
    expect(response.status).toBe(201);

    // Org name should be derived from user name
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO organizations'),
      expect.arrayContaining(["Jane's Organization"])
    );
  });

  it('generates org name from email slug when no name or company', async () => {
    mockQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'new-org' }])
      .mockResolvedValueOnce(undefined);

    const response = await POST(makeRequest({
      email: 'bob@example.com',
      password: 'password123',
    }));
    expect(response.status).toBe(201);

    // Org name should be derived from email prefix
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO organizations'),
      expect.arrayContaining(['bob org'])
    );
  });

  it('returns 503 when database connection fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));

    const response = await POST(makeRequest({
      email: 'test@example.com',
      password: 'password123',
    }));
    expect(response.status).toBe(503);
  });
});
