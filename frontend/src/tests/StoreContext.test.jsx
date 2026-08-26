import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { StoreProvider, useStore } from '../context/StoreContext';
import { AuthProvider } from '../context/AuthContext';

const wrapper = ({ children }) => (
  <AuthProvider devBypass={true}>
    <StoreProvider>
      {children}
    </StoreProvider>
  </AuthProvider>
);

describe('StoreContext State & Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('addProject optimistically adds project and issues POST request', async () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    let newKey;
    await act(async () => {
      newKey = await result.current.addProject({
        name: 'Villa Aurelia',
        client: 'Aurelia Properties',
        offering: 'Signature'
      });
    });

    expect(newKey).toBe('villa-aurelia');
    expect(result.current.projects['villa-aurelia']).toBeDefined();
    expect(result.current.projects['villa-aurelia'].name).toBe('Villa Aurelia');
    expect(result.current.projects['villa-aurelia'].client).toBe('Aurelia Properties');
  });

  test('updateProject immediately persists added orders to backend', async () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    // Add base project
    await act(async () => {
      await result.current.addProject({
        name: 'Cape Manor',
        client: 'Manor Estate',
        orders: []
      });
    });

    // Add order to project
    const newOrder = {
      id: 'PO-2026-9999',
      supplier: 'Standard Lighting',
      items: 1,
      value: 5000,
      paid: 0,
      outstanding: 5000,
      status: 'Pending',
      eta: '2026-09-01',
      itemsList: [
        {
          id: 'I-9999-1',
          qty: 2,
          type: 'DL-01',
          description: 'LED Downlight',
          unitCost: 1500,
          unitRetail: 2500
        }
      ]
    };

    await act(async () => {
      await result.current.updateProject('cape-manor', 'orders', [newOrder]);
    });

    expect(result.current.projects['cape-manor'].orders).toHaveLength(1);
    expect(result.current.projects['cape-manor'].orders[0].id).toBe('PO-2026-9999');
  });

  test('saveDraftProject updates project key and persists to backend', async () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    // Add draft project
    let draftKey;
    await act(async () => {
      draftKey = await result.current.addProject({
        name: '',
        client: '',
        isDraft: true
      });
    });

    let finalKey;
    await act(async () => {
      finalKey = await result.current.saveDraftProject(draftKey, {
        name: 'Ocean View Residence',
        client: 'Ocean View Estates',
        offering: 'Signature'
      });
    });

    expect(finalKey).toBe('ocean-view-residence');
    expect(result.current.projects['ocean-view-residence']).toBeDefined();
    expect(result.current.projects['ocean-view-residence'].name).toBe('Ocean View Residence');
    expect(result.current.projects[draftKey]).toBeUndefined();
  });
});
