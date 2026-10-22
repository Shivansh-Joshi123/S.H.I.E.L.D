import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import type {
  NetworkStateResponse,
  CableSegment,
  FaultRecord,
  SensorMeasurement,
  FaultEvent,
  NotificationItem,
  FaultType,
} from './types';
import { Navbar } from './components/Navbar';
import { NetworkVisualizer } from './components/NetworkVisualizer';
import { MetricsCards } from './components/MetricsCards';
import { MeasurementCharts } from './components/MeasurementCharts';
import { LiveEventLog } from './components/LiveEventLog';
import { FaultInjectionModal } from './components/FaultInjectionModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { LocalizationAnalysis } from './components/LocalizationAnalysis';
import { RelayControlPanel } from './components/RelayControlPanel';
import { HistoricalManagement } from './components/HistoricalManagement';
import { ConfigModal } from './components/ConfigModal';
import { SegmentDetailModal } from './components/SegmentDetailModal';

export const App: React.FC = () => {
  const [network, setNetwork] = useState<NetworkStateResponse | null>(null);
  const [measurements, setMeasurements] = useState<SensorMeasurement[]>([]);
  const [events, setEvents] = useState<FaultEvent[]>([]);
  const [faults, setFaults] = useState<FaultRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'network' | 'localization' | 'relays' | 'history'>('network');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isInjectModalOpen, setIsInjectModalOpen] = useState<boolean>(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [selectedSegment, setSelectedSegment] = useState<CableSegment | null>(null);

  // Refresh core data
  const fetchData = useCallback(async () => {
    try {
      const net = await api.getNetwork();
      setNetwork(net);

      const [meas, evs, flts, notifs, unread] = await Promise.all([
        api.getMeasurements(undefined, 60),
        api.getEvents(40),
        api.getFaults(),
        api.getNotifications(false),
        api.getUnreadCount(),
      ]);

      setMeasurements(meas);
      setEvents(evs);
      setFaults(flts);
      setNotifications(notifs);
      setUnreadCount(unread.count);
      setError(null);
    } catch (err: any) {
      console.warn('Backend sync error:', err.message);
    }
  }, []);

  // Initial load and periodic 1.5s refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 1500);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Simulation Controls
  const handleStart = async () => {
    setLoading(true);
    try {
      await api.startSimulation();
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to start simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await api.stopSimulation();
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to stop simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await api.resetSimulation();
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to reset simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleInjectFault = async (segmentId: number, faultType: FaultType, distanceKm?: number) => {
    await api.injectFault(segmentId, faultType, distanceKm);
    await fetchData();
  };

  const handleToggleRelay = async (relayId: number, currentState: 'OPEN' | 'CLOSED') => {
    try {
      if (currentState === 'CLOSED') {
        await api.openRelay(relayId, 'OPERATOR_MANUAL');
      } else {
        await api.closeRelay(relayId, 'OPERATOR_MANUAL');
      }
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Relay operation failed');
    }
  };

  const handleClearFault = async (faultId: number) => {
    try {
      await api.clearFault(faultId);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to clear fault');
    }
  };

  const handleTriggerManualIsolation = async () => {
    try {
      await api.triggerManualIsolation();
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Manual isolation failed');
    }
  };

  const handleExportCsv = () => {
    window.open(api.getCsvExportUrl(), '_blank');
  };

  const handleSaveConfig = async (cfg: any) => {
    await api.updateConfiguration(cfg);
    await fetchData();
  };

  const handleUpdateBackupFeeder = async (available: boolean, capacityAmperes: number) => {
    try {
      await api.updateBackupFeeder({ available, capacityAmperes });
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update backup feeder');
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    await api.markNotificationRead(id);
    await fetchData();
  };

  const handleMarkAllNotificationsRead = async () => {
    await api.markAllNotificationsRead();
    await fetchData();
  };

  const segments = network?.segments ?? [];
  const relays = network?.relays ?? [];
  const backupFeeder = network?.backupFeeder ?? null;
  const loads = network?.loads ?? [];
  const status = network?.simulationStatus ?? null;

  // Selected segment relay lookup
  const selectedSegmentRelay = selectedSegment
    ? relays.find((r) => r.segmentId === selectedSegment.id)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navbar */}
      <Navbar
        status={status}
        unreadCount={unreadCount}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onStart={handleStart}
        onStop={handleStop}
        onReset={handleReset}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        loading={loading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab 1: Live Network Dashboard */}
        {activeTab === 'network' && (
          <div className="space-y-6">
            {/* Top Metrics Cards */}
            <MetricsCards
              status={status}
              segments={segments}
              backupFeeder={backupFeeder}
              loads={loads}
            />

            {/* Network SVG Circuit Visualizer */}
            <NetworkVisualizer
              segments={segments}
              relays={relays}
              backupFeeder={backupFeeder}
              loads={loads}
              activeFault={status?.activeFault ?? null}
              simulationRunning={status?.running ?? false}
              onSelectSegment={(seg) => setSelectedSegment(seg)}
              onToggleRelay={handleToggleRelay}
              onOpenInjectModal={() => setIsInjectModalOpen(true)}
            />

            {/* Grid of Real-Time Charts & Live Audit Log */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <MeasurementCharts measurements={measurements} />
              </div>
              <div className="lg:col-span-5">
                <LiveEventLog events={events} onExportCsv={handleExportCsv} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Localization Analysis Calculator */}
        {activeTab === 'localization' && (
          <LocalizationAnalysis
            segments={segments}
            referenceVoltageV={status?.referenceVoltageV ?? 11000}
            totalLengthKm={status?.totalCableLengthKm ?? 10.0}
            lastFaultVoltageV={segments[0]?.lastVoltageV}
            lastActualDistanceKm={status?.activeFault?.actualDistanceKm}
          />
        )}

        {/* Tab 3: Relays & Backup Feeder Controls */}
        {activeTab === 'relays' && (
          <RelayControlPanel
            relays={relays}
            backupFeeder={backupFeeder}
            segments={segments}
            onToggleRelay={handleToggleRelay}
            onUpdateBackupFeeder={handleUpdateBackupFeeder}
            onTriggerManualIsolation={handleTriggerManualIsolation}
          />
        )}

        {/* Tab 4: Historical Management & Audit Trail */}
        {activeTab === 'history' && (
          <HistoricalManagement
            faults={faults}
            events={events}
            segments={segments}
            onClearFault={handleClearFault}
            onExportCsv={handleExportCsv}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>S.H.I.E.L.D. — Self-Healing IoT for Early Localization and Detection of Underground Cable Faults</p>
        <p className="text-[10px] text-slate-600 mt-1">
          Academic Engineering Prototype | Spring Boot 3.3.4 (Java 17) + React 19 + Tailwind CSS + Lucide Icons
        </p>
      </footer>

      {/* Modals & Slideouts */}
      <FaultInjectionModal
        isOpen={isInjectModalOpen}
        onClose={() => setIsInjectModalOpen(false)}
        segments={segments}
        onInject={handleInjectFault}
        simulationRunning={status?.running ?? false}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
      />

      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSaveConfig={handleSaveConfig}
        currentLT={status?.totalCableLengthKm ?? 10.0}
        currentVT={status?.referenceVoltageV ?? 11000.0}
      />

      <SegmentDetailModal
        segment={selectedSegment}
        relay={selectedSegmentRelay}
        onClose={() => setSelectedSegment(null)}
        onToggleRelay={handleToggleRelay}
      />
    </div>
  );
};

export default App;
