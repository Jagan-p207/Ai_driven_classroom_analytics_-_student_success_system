import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AlertBanner from './components/AlertBanner';
import RiskOverviewCards from './components/RiskOverviewCards';
import ClassHeatmap from './components/ClassHeatmap';
import StudentRiskTable from './components/StudentRiskTable';
import StudentDetailModal from './components/StudentDetailModal';
import IngestionModal, { IngestionContent } from './components/IngestionModal';
import ModelInfoModal, { ModelInfoContent } from './components/ModelInfoModal';
import HistoricalAnalyticsSection from './components/HistoricalAnalyticsSection';
import { fetchClassRiskSummary, fetchStudents, triggerRecompute, seedSampleData } from './services/api';

export default function App() {
  const [classSummary, setClassSummary] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [isModelInfoOpen, setIsModelInfoOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [lastRecomputeTime, setLastRecomputeTime] = useState(null);
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [activeView, setActiveView] = useState('overview'); // 'overview' | 'roster' | 'ml-models' | 'data-ingest'

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, studentsData] = await Promise.all([
        fetchClassRiskSummary('CS101'),
        fetchStudents()
      ]);
      setClassSummary(summaryData);
      setStudents(studentsData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching classroom analytics:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTriggerRecompute = async () => {
    try {
      setRecomputing(true);
      const res = await triggerRecompute();
      setLastRecomputeTime(res.timestamp);
      await loadData();
      showNotification(`Batch scoring complete: ${res.students_scored} students evaluated across 12 features.`);
    } catch (err) {
      showNotification(`Recomputation failed: ${err.message}`, true);
    } finally {
      setRecomputing(false);
    }
  };

  const handleSeedData = async () => {
    try {
      setLoading(true);
      const res = await seedSampleData();
      await loadData();
      showNotification('Synthetic pilot dataset (130 students) reloaded and scored successfully.');
    } catch (err) {
      showNotification(`Seeding failed: ${err.message}`, true);
      setLoading(false);
    }
  };

  const showNotification = (msg, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-canvas)' }}>
      {/* Navigation */}
      <Navbar
        activeView={activeView}
        onSelectView={(v) => setActiveView(v)}
        onTriggerRecompute={handleTriggerRecompute}
        recomputing={recomputing}
        onOpenIngest={() => setIsIngestOpen(true)}
        onOpenModelInfo={() => setIsModelInfoOpen(true)}
        onSeedData={handleSeedData}
        lastRecomputeTime={lastRecomputeTime}
      />

      {/* Main Dashboard Container */}
      <main style={{ maxWidth: 1400, width: '100%', margin: '0 auto', padding: '24px 28px', flex: 1 }}>
        {/* Toast Notification */}
        {notification && (
          <div style={{
            position: 'fixed',
            top: 76,
            right: 28,
            zIndex: 999,
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            background: notification.isError ? 'var(--risk-high-solid)' : '#047857',
            color: '#ffffff',
            fontWeight: 500,
            fontSize: '0.82rem',
            boxShadow: 'var(--shadow-md)',
            animation: 'slideUp 0.15s ease-out'
          }}>
            {notification.msg}
          </div>
        )}

        {loading && !classSummary ? (
          <div style={{
            textAlign: 'center',
            padding: '90px 0',
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 6 }}>
              Loading Classroom Analytics...
            </div>
            <p style={{ fontSize: '0.82rem' }}>
              Aggregating attendance, assessment marks, LMS activity, and running risk models.
            </p>
          </div>
        ) : (
          <div>
            {/* VIEW 1: Overview Dashboard */}
            {activeView === 'overview' && (
              <div>
                {/* Alert Banner for Students Requiring Follow-Up */}
                <AlertBanner
                  alerts={classSummary?.high_risk_alerts || []}
                  onSelectStudent={(id) => setSelectedStudentId(id)}
                />

                {/* KPI Metric Cards */}
                <RiskOverviewCards summary={classSummary} />

                {/* Cohort Risk Matrix Heatmap */}
                <ClassHeatmap
                  heatmapData={classSummary?.heatmap_data || []}
                  onSelectStudent={(id) => setSelectedStudentId(id)}
                  selectedStudentId={selectedStudentId}
                  riskFilter={riskFilter}
                  onRiskFilterChange={(f) => setRiskFilter(f)}
                  onFilterChange={(f) => setRiskFilter(f)}
                />

                {/* Historical Milestone Progression Section */}
                <HistoricalAnalyticsSection classId="CS101" refreshTrigger={lastRecomputeTime} />

                {/* Full Student Roster & Trend Registry */}
                <StudentRiskTable
                  students={students}
                  onSelectStudent={(id) => setSelectedStudentId(id)}
                  riskFilter={riskFilter}
                  onRiskFilterChange={(f) => setRiskFilter(f)}
                  onFilterChange={(f) => setRiskFilter(f)}
                />
              </div>
            )}

            {/* VIEW 2: Student Registry Only */}
            {activeView === 'roster' && (
              <div>
                <RiskOverviewCards summary={classSummary} />
                <StudentRiskTable
                  students={students}
                  onSelectStudent={(id) => setSelectedStudentId(id)}
                  riskFilter={riskFilter}
                  onRiskFilterChange={(f) => setRiskFilter(f)}
                  onFilterChange={(f) => setRiskFilter(f)}
                />
              </div>
            )}

            {/* VIEW 3: Dedicated ML Intelligence View */}
            {activeView === 'ml-models' && (
              <div className="editorial-card" style={{ padding: '24px', marginBottom: 24 }}>
                <ModelInfoContent onClose={() => setActiveView('overview')} isModal={false} />
              </div>
            )}

            {/* VIEW 4: Dedicated Data Ingestion Pipeline View */}
            {activeView === 'data-ingest' && (
              <div className="editorial-card" style={{ padding: '24px', marginBottom: 24, maxWidth: 800, margin: '0 auto 24px' }}>
                <div style={{ marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
                  <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0 }}>
                    Institutional CSV Ingestion & Batch Scorer
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2, margin: '2px 0 0' }}>
                    Upload registrar spreadsheets to update attendance, coursework marks, and LMS activity.
                  </p>
                </div>
                <IngestionContent
                  onClose={() => setActiveView('overview')}
                  onIngestionComplete={(res) => {
                    loadData();
                    if (res?.recompute_result?.timestamp) {
                      setLastRecomputeTime(res.recompute_result.timestamp);
                    } else {
                      setLastRecomputeTime(new Date().toISOString());
                    }
                    const msg = res?.recompute_result
                      ? `Ingested ${res.records_imported} records. Recomputed risk scores for ${res.recompute_result.students_scored} students.`
                      : res?.message || 'Ingestion completed successfully.';
                    showNotification(msg);
                  }}
                  isModal={false}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '16px 28px',
        textAlign: 'center',
        fontSize: '0.76rem',
        color: 'var(--text-muted)',
        background: 'var(--bg-surface)'
      }}>
        EduPulse AI — AI-Driven Classroom Analytics and Student Success System • Three-Tier Architecture • TreeSHAP Explainability Verified
      </footer>

      {/* Student Drill-Down Detail Modal */}
      <StudentDetailModal
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        onInterventionUpdated={() => {
          loadData();
          showNotification('Student intervention record updated and saved.');
        }}
      />

      {/* CSV Ingestion Modal (Supports direct modal trigger) */}
      <IngestionModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        onIngestionComplete={(res) => {
          loadData();
          if (res?.recompute_result?.timestamp) {
            setLastRecomputeTime(res.recompute_result.timestamp);
          } else {
            setLastRecomputeTime(new Date().toISOString());
          }
          const msg = res?.recompute_result
            ? `Ingested ${res.records_imported} records. Recomputed risk scores for ${res.recompute_result.students_scored} students.`
            : res?.message || 'Ingestion completed successfully.';
          showNotification(msg);
        }}
      />

      {/* ML Intelligence Modal (Supports direct modal trigger) */}
      <ModelInfoModal
        isOpen={isModelInfoOpen}
        onClose={() => setIsModelInfoOpen(false)}
      />
    </div>
  );
}
