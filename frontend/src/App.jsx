import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AlertBanner from './components/AlertBanner';
import RiskOverviewCards from './components/RiskOverviewCards';
import ClassHeatmap from './components/ClassHeatmap';
import StudentRiskTable from './components/StudentRiskTable';
import StudentDetailModal from './components/StudentDetailModal';
import IngestionModal from './components/IngestionModal';
import ModelInfoModal from './components/ModelInfoModal';
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
      showNotification(`Batch scoring complete: ${res.students_scored} students evaluated.`);
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
      showNotification('Synthetic pilot dataset (130 students) reloaded and scored.');
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <Navbar
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
            top: 80,
            right: 28,
            zIndex: 999,
            padding: '12px 20px',
            borderRadius: 'var(--radius-sm)',
            background: notification.isError ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.85rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            animation: 'slideUp 0.2s ease-out'
          }}>
            {notification.msg}
          </div>
        )}

        {loading && !classSummary ? (
          <div style={{
            textAlign: 'center',
            padding: '100px 0',
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontSize: '1.2rem', color: '#fff', marginBottom: 8 }}>
              Initializing Early-Warning Classroom Analytics...
            </div>
            <p style={{ fontSize: '0.85rem' }}>
              Loading attendance, assessment marks, LMS activity, and running risk models.
            </p>
          </div>
        ) : (
          <div>
            {/* Alert Banner for High / Medium Risk students */}
            <AlertBanner
              alerts={classSummary?.high_risk_alerts || []}
              onSelectStudent={(id) => setSelectedStudentId(id)}
            />

            {/* KPI Metric Cards */}
            <RiskOverviewCards summary={classSummary} />

            {/* Class Heatmap Matrix */}
            <ClassHeatmap
              heatmapData={classSummary?.heatmap_data || []}
              onSelectStudent={(id) => setSelectedStudentId(id)}
              selectedStudentId={selectedStudentId}
              riskFilter={riskFilter}
              onRiskFilterChange={(f) => setRiskFilter(f)}
              onFilterChange={(f) => setRiskFilter(f)}
            />

            {/* Historical Milestone Progression & Mobility Section */}
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
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-glass)',
        padding: '20px 28px',
        textAlign: 'center',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        background: 'rgba(7, 10, 18, 0.9)'
      }}>
        AI-Driven Classroom Analytics and Student Success System • Three-Tier Architecture: Data Layer → ML Processing Layer → Presentation Layer • SHAP Explainability Enabled
      </footer>

      {/* Student Drill-Down Detail Modal */}
      <StudentDetailModal
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
        onInterventionUpdated={() => {
          loadData();
          showNotification('Intervention record updated successfully.');
        }}
      />

      {/* CSV Ingestion Modal */}
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

      {/* ML Intelligence & Explainability Modal */}
      <ModelInfoModal
        isOpen={isModelInfoOpen}
        onClose={() => setIsModelInfoOpen(false)}
      />
    </div>
  );
}
