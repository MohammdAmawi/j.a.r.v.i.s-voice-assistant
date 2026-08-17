/**
 * TEST SUITE 7 — React Component: TelemetryBar.tsx
 *
 * Coverage:
 *  ✔ Renders telemetry metrics (CPU, RAM, Network)
 *  ✔ Renders all 10 navigation tab buttons
 *  ✔ Active tab is visually highlighted
 *  ✔ Clicking a tab calls onSelectTab with correct id
 *  ✔ Tab IDs follow the tab-{id} pattern for browser testing
 *  ✔ CONNECTED badge renders
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TelemetryBar, type ActiveTab } from '../components/TelemetryBar';
import type { SystemTelemetry } from '../types';

const MOCK_TELEMETRY: SystemTelemetry = {
  cpuUsage: 42,
  ramUsage: 61,
  networkSpeed: '120 MB/s',
  powerCore: 98,
  uptimeSeconds: 3600,
  isOnline: true,
  platform: 'win32',
  nodeVersion: 'v20.0.0',
  hostname: 'JARVIS-PC',
};

const TABS: ActiveTab[] = [
  'chat', 'audio', 'openjarvis', 'os', 'files',
  'spotify', 'memory', 'search', 'architecture', 'tests',
];

function renderTelemetryBar(activeTab: ActiveTab = 'chat', onSelectTab = vi.fn()) {
  const user = userEvent.setup();
  const utils = render(
    <TelemetryBar
      telemetry={MOCK_TELEMETRY}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
    />
  );
  return { user, onSelectTab, ...utils };
}

describe('TelemetryBar — telemetry display', () => {
  it('renders CPU usage', () => {
    renderTelemetryBar();
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('renders RAM usage', () => {
    renderTelemetryBar();
    expect(screen.getByText('61%')).toBeInTheDocument();
  });

  it('renders network speed', () => {
    renderTelemetryBar();
    expect(screen.getByText('120 MB/s')).toBeInTheDocument();
  });

  it('shows CONNECTED badge', () => {
    renderTelemetryBar();
    expect(screen.getByText('CONNECTED')).toBeInTheDocument();
  });
});

describe('TelemetryBar — tab rendering', () => {
  it('renders all 10 navigation tabs', () => {
    renderTelemetryBar();
    TABS.forEach((tab) => {
      const btn = document.getElementById(`tab-${tab}`);
      expect(btn).toBeInTheDocument();
    });
  });

  it('assigns id="tab-{id}" to each button', () => {
    renderTelemetryBar();
    TABS.forEach((tab) => {
      expect(document.getElementById(`tab-${tab}`)).not.toBeNull();
    });
  });
});

describe('TelemetryBar — tab selection', () => {
  it('calls onSelectTab with the correct tab id when clicked', async () => {
    const { user, onSelectTab } = renderTelemetryBar();
    const audioTab = document.getElementById('tab-audio')!;
    await user.click(audioTab);
    expect(onSelectTab).toHaveBeenCalledWith('audio');
  });

  it('calls onSelectTab with openjarvis when OPENJARVIS tab clicked', async () => {
    const { user, onSelectTab } = renderTelemetryBar();
    const tab = document.getElementById('tab-openjarvis')!;
    await user.click(tab);
    expect(onSelectTab).toHaveBeenCalledWith('openjarvis');
  });

  it('active tab has the active CSS class (border-cyan-400)', () => {
    renderTelemetryBar('openjarvis');
    const tab = document.getElementById('tab-openjarvis')!;
    // The active tab gets border-cyan-400/80 in its className
    expect(tab.className).toContain('bg-cyan-500/20');
  });

  it('inactive tab does NOT have active CSS class', () => {
    renderTelemetryBar('chat');
    const tab = document.getElementById('tab-openjarvis')!;
    expect(tab.className).not.toContain('bg-cyan-500/20');
  });

  it('calls onSelectTab exactly once per click', async () => {
    const { user, onSelectTab } = renderTelemetryBar();
    const tab = document.getElementById('tab-tests')!;
    await user.click(tab);
    expect(onSelectTab).toHaveBeenCalledTimes(1);
  });
});
