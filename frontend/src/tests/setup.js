import '@testing-library/jest-dom';
import { vi } from 'vitest';

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({})
});
