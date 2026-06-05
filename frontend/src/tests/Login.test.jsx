import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import Login from '../Login';
import { AuthProvider } from '../context/AuthContext';

// Simple wrapper to provide context
const renderWithProviders = (ui) => {
  return render(
    <AuthProvider>
      {ui}
    </AuthProvider>
  );
};

describe('Login Component', () => {
  test('renders login title and inputs', () => {
    renderWithProviders(<Login onBypass={() => {}} />);
    
    expect(screen.getByText('1-to-1 World Portal')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@onetoone.co.za')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  test('allows typing in email and password', () => {
    renderWithProviders(<Login onBypass={() => {}} />);
    
    const emailInput = screen.getByPlaceholderText('name@onetoone.co.za');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    fireEvent.change(emailInput, { target: { value: 'admin@onetoone.co.za' } });
    fireEvent.change(passwordInput, { target: { value: 'admin123' } });

    expect(emailInput.value).toBe('admin@onetoone.co.za');
    expect(passwordInput.value).toBe('admin123');
  });

  test('triggers onBypass when dev bypass is clicked', () => {
    const handleBypass = vi.fn();
    renderWithProviders(<Login onBypass={handleBypass} />);
    
    const bypassButton = screen.getByText('Direct Developer Bypass');
    fireEvent.click(bypassButton);
    
    expect(handleBypass).toHaveBeenCalled();
  });
});
