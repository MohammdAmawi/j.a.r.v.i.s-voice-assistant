/**
 * TEST SUITE 5 — React Component: OpenJarvisHUD.tsx
 *
 * Strategy:
 *  - Render the component with React Testing Library in jsdom.
 *  - Mock queryOpenJarvis service module to avoid real IPC.
 *  - Test all UI states: idle, loading, success, error.
 *  - Test keyboard interaction (Enter vs Shift+Enter).
 *  - Test quick suggestion chips.
 *  - Test session history accumulation and clear.
 *  - Test copy-to-clipboard.
 *  - Test error banner rendering and dismissal.
 *
 * Coverage:
 *  ✔ Initial idle render (standby state)
 *  ✔ Loading state (spinner visible, button disabled)
 *  ✔ Successful response display
 *  ✔ Error banner on CLI failure
 *  ✔ Error banner dismissal via × button
 *  ✔ Enter key submits form
 *  ✔ Shift+Enter inserts newline (does NOT submit)
 *  ✔ Quick suggestion chip submits directly
 *  ✔ Session history records after success
 *  ✔ Session history records after error
 *  ✔ CLEAR button wipes history
 *  ✔ RESET button clears input
 *  ✔ Copy button copies response and shows "COPIED" feedback
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenJarvisHUD } from '../components/OpenJarvisHUD';
 
// ──────────────────────────────────────────────────────────────────────────────
// Mock the service layer
// ──────────────────────────────────────────────────────────────────────────────
vi.mock('../services/openJarvisService', () => ({
  queryOpenJarvis: vi.fn(),
}));

// soundFx mock is already applied globally in setup.ts

import { queryOpenJarvis } from '../services/openJarvisService';
const mockQuery = queryOpenJarvis as ReturnType<typeof vi.fn>;

// ──────────────────────────────────────────────────────────────────────────────
// Helper to render and return the user-event instance
// ──────────────────────────────────────────────────────────────────────────────
function renderHUD() {
  const user = userEvent.setup();
  const utils = render(<OpenJarvisHUD />);
  return { user, ...utils };
}

describe('OpenJarvisHUD — initial render', () => {
  it('renders the OPENJARVIS LOCAL ENGINE GATEWAY heading', () => {
    renderHUD();
    expect(screen.getByText(/OPENJARVIS LOCAL ENGINE GATEWAY/i)).toBeInTheDocument();
  });

  it('shows STANDBY / READY status initially', () => {
    renderHUD();
    expect(screen.getByText(/STANDBY \/ READY/i)).toBeInTheDocument();
  });

  it('shows the empty state placeholder when no query has been made', () => {
    renderHUD();
    expect(screen.getByText(/No active query output/i)).toBeInTheDocument();
  });

  it('submit button is disabled when input is empty', () => {
    renderHUD();
    const btn = screen.getByRole('button', { name: /SEND TO OPENJARVIS/i });
    expect(btn).toBeDisabled();
  });

  it('renders four quick suggestion chips', () => {
    renderHUD();
    // Each chip is a button containing suggestion text
    expect(screen.getByText(/List all system capabilities/i)).toBeInTheDocument();
    expect(screen.getByText(/What is the current status/i)).toBeInTheDocument();
    expect(screen.getByText(/Explain how OpenJarvis integrates/i)).toBeInTheDocument();
    expect(screen.getByText(/Write a Python function/i)).toBeInTheDocument();
  });
});

describe('OpenJarvisHUD — loading state', () => {
  it('shows EXECUTING CLI status and spinner during query', async () => {
    // Make the query hang indefinitely
    mockQuery.mockReturnValue(new Promise(() => {}));
    const { user } = renderHUD();

    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);
    await user.type(textarea, 'test query');

    const submitBtn = screen.getByRole('button', { name: /SEND TO OPENJARVIS/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/EXECUTING CLI/i)).toBeInTheDocument();
      expect(screen.getByText(/PROCESSING\.\.\./i)).toBeInTheDocument();
    });

    expect(textarea).toBeDisabled();
  });
});

describe('OpenJarvisHUD — successful response', () => {
  beforeEach(() => {
    mockQuery.mockResolvedValue('Understood, Sir. All systems are nominal.');
  });

  it('displays the response text after submission', async () => {
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);
    await user.type(textarea, 'status check');
    await user.click(screen.getByRole('button', { name: /SEND TO OPENJARVIS/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/All systems are nominal/i)[0]).toBeInTheDocument();
    });
  });

  it('clears the input field after successful submission', async () => {
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i) as HTMLTextAreaElement;
    await user.type(textarea, 'status check');
    await user.click(screen.getByRole('button', { name: /SEND TO OPENJARVIS/i }));

    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('adds a SUCCESS record to session history', async () => {
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);
    await user.type(textarea, 'status check');
    await user.click(screen.getByRole('button', { name: /SEND TO OPENJARVIS/i }));

    await waitFor(() => {
      expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    });
  });

  it('shows COPY button when response is present', async () => {
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);
    await user.type(textarea, 'status check');
    await user.click(screen.getByRole('button', { name: /SEND TO OPENJARVIS/i }));

    await waitFor(() => {
      expect(screen.getAllByText('COPY')[0]).toBeInTheDocument();
    });
  });

  it('copies response to clipboard and shows COPIED feedback', async () => {
    const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);
    await user.type(textarea, 'copy test');
    await user.click(screen.getByRole('button', { name: /SEND TO OPENJARVIS/i }));

    await waitFor(() => expect(screen.getAllByText('COPY')[0]).toBeInTheDocument());
    await user.click(screen.getAllByText('COPY')[0]);

    await waitFor(() => {
      expect(screen.getByText('COPIED')).toBeInTheDocument();
    });
    expect(writeTextSpy).toHaveBeenCalledWith(
      'Understood, Sir. All systems are nominal.'
    );
  });
});

describe('OpenJarvisHUD — error state', () => {
  beforeEach(() => {
    mockQuery.mockRejectedValue(new Error('OpenJarvis CLI execution failed: timeout exceeded'));
  });

  it('renders the error banner with "Execution Failed" heading', async () => {
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);
    await user.type(textarea, 'broken query');
    await user.click(screen.getByRole('button', { name: /SEND TO OPENJARVIS/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Execution Failed/i)[0]).toBeInTheDocument();
      expect(screen.getAllByText(/timeout exceeded/i)[0]).toBeInTheDocument();
    });
  });

  it('adds a FAILED record to session history', async () => {
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);
    await user.type(textarea, 'broken query');
    await user.click(screen.getByRole('button', { name: /SEND TO OPENJARVIS/i }));

    await waitFor(() => {
      expect(screen.getByText('ERROR')).toBeInTheDocument();
    });
  });

  it('dismisses the error banner when × is clicked', async () => {
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);
    await user.type(textarea, 'broken query');
    await user.click(screen.getByRole('button', { name: /SEND TO OPENJARVIS/i }));

    await waitFor(() => expect(screen.getAllByText(/Execution Failed/i)[0]).toBeInTheDocument());
    // Find and click the dismiss × button
    const dismissBtn = screen.getByTitle('Dismiss error');
    await user.click(dismissBtn);

    await waitFor(() => {
      expect(screen.queryByText(/^Execution Failed$/i)).not.toBeInTheDocument();
    });
  });
});

describe('OpenJarvisHUD — keyboard interaction', () => {
  beforeEach(() => {
    mockQuery.mockResolvedValue('Response text');
  });

  it('submits on Enter key press', async () => {
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);
    await user.type(textarea, 'keyboard test{Enter}');

    await waitFor(() => {
      expect(mockQuery).toHaveBeenCalledWith('keyboard test');
    });
  });

  it('does NOT submit on Shift+Enter (inserts newline instead)', async () => {
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i) as HTMLTextAreaElement;
    await user.type(textarea, 'line one');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(textarea, 'line two');

    // mockQuery should NOT have been called yet
    expect(mockQuery).not.toHaveBeenCalled();
    // The textarea value should contain a newline
    expect(textarea.value).toContain('\n');
  });

  it('does not submit when input is empty on Enter', async () => {
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);
    await user.click(textarea);
    await user.keyboard('{Enter}');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

describe('OpenJarvisHUD — quick suggestion chips', () => {
  it('submits the chip text directly on click (bypasses textarea)', async () => {
    mockQuery.mockResolvedValue('Chip response');
    const { user } = renderHUD();

    await user.click(screen.getByText(/List all system capabilities/i));

    await waitFor(() => {
      expect(mockQuery).toHaveBeenCalledWith('List all system capabilities and available tools');
    });
  });

  it('chips are disabled when a query is loading', async () => {
    mockQuery.mockReturnValue(new Promise(() => {}));
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);
    await user.type(textarea, 'loading...');
    await user.click(screen.getByRole('button', { name: /SEND TO OPENJARVIS/i }));

    await waitFor(() => {
      const chip = screen.getByText(/List all system capabilities/i).closest('button');
      expect(chip).toBeDisabled();
    });
  });
});

describe('OpenJarvisHUD — session history management', () => {
  it('accumulates multiple history entries', async () => {
    mockQuery
      .mockResolvedValueOnce('First response')
      .mockResolvedValueOnce('Second response');

    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);

    // First query
    await user.type(textarea, 'query one');
    await user.click(screen.getByRole('button', { name: /SEND TO OPENJARVIS/i }));
    await waitFor(() => screen.getByText(/query one/i));

    // Second query
    await user.type(textarea, 'query two');
    await user.click(screen.getByRole('button', { name: /SEND TO OPENJARVIS/i }));
    await waitFor(() => screen.getByText(/query two/i));

    expect(screen.getByText(/2 RECORDS/i)).toBeInTheDocument();
  });

  it('CLEAR button removes all history and response', async () => {
    mockQuery.mockResolvedValue('Some response');
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i);
    await user.type(textarea, 'some query');
    await user.click(screen.getByRole('button', { name: /SEND TO OPENJARVIS/i }));
    await waitFor(() => screen.getByText('CLEAR'));

    await user.click(screen.getByText('CLEAR'));

    await waitFor(() => {
      expect(screen.queryByText(/1 RECORD/i)).not.toBeInTheDocument();
      expect(screen.getByText(/No active query output/i)).toBeInTheDocument();
    });
  });
});

describe('OpenJarvisHUD — RESET button', () => {
  it('clears the prompt textarea without submitting', async () => {
    mockQuery.mockResolvedValue('ok');
    const { user } = renderHUD();
    const textarea = screen.getByPlaceholderText(/Enter prompt for OpenJarvis/i) as HTMLTextAreaElement;
    await user.type(textarea, 'some text');

    const resetBtn = screen.getByRole('button', { name: /RESET/i });
    await user.click(resetBtn);

    expect(textarea.value).toBe('');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
