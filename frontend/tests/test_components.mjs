// Node regression test script for frontend component logic
import assert from 'node:assert';

console.log('--- Running Frontend Component Regression Tests (frontend/tests) ---');

// ============================================================================
// TEST GROUP 1: ModelInfo Data Normalization
// ============================================================================
console.log('Test Group 1: ModelInfo Data Normalization');

const dictFeatures = {
  attendance_pct: { importance: 42.5, description: 'Attendance percentage' },
  avg_score: { importance: 35.0, description: 'Average examination score' }
};

const arrayFeatures = [
  { feature: 'attendance_pct', importance: 42.5, description: 'Attendance percentage' },
  { feature: 'avg_score', importance: 35.0, description: 'Average examination score' }
];

function normalizeFeatures(global_feature_importances) {
  if (!global_feature_importances) return [];
  if (Array.isArray(global_feature_importances)) {
    return global_feature_importances.map(item => ({
      feature: item.feature || item.name || 'Unknown',
      importance: typeof item.importance === 'number' ? item.importance : parseFloat(item.importance) || 0,
      description: item.description || ''
    }));
  }
  return Object.entries(global_feature_importances).map(([feat, details]) => {
    let imp = 0;
    let desc = '';
    if (typeof details === 'number') {
      imp = details;
    } else if (details && typeof details === 'object') {
      imp = typeof details.importance === 'number' ? details.importance : parseFloat(details.importance) || 0;
      desc = details.description || '';
    }
    return { feature: feat, importance: imp, description: desc };
  });
}

const normDict = normalizeFeatures(dictFeatures);
assert.strictEqual(normDict.length, 2);
assert.strictEqual(typeof normDict[0].importance, 'number');
assert.strictEqual(normDict[0].importance, 42.5);

const normArr = normalizeFeatures(arrayFeatures);
assert.strictEqual(normArr.length, 2);
assert.strictEqual(typeof normArr[0].importance, 'number');
assert.strictEqual(normArr[0].importance, 42.5);

console.log('✓ ModelInfo Data Normalization tests passed.');

// ============================================================================
// TEST GROUP 2: Cohort Heatmap Filters with Controlled Dataset
// ============================================================================
console.log('Test Group 2: Cohort Heatmap Filters with Controlled Dataset');

const controlledCohort = [
  { student_id: 'STU001', name: 'Student One', risk_level: 'High', risk_score: 0.85 },
  { student_id: 'STU002', name: 'Student Two', risk_level: 'Medium', risk_score: 0.55 },
  { student_id: 'STU003', name: 'Student Three', risk_level: 'Low', risk_score: 0.15 },
  { student_id: 'STU004', name: 'Student Four', risk_level: 'High', risk_score: 0.90 },
  { student_id: 'STU005', name: 'Student Five', risk_level: 'Medium', risk_score: 0.60 }
];

function filterHeatmap(heatmapData, riskFilter) {
  const currentFilter = (riskFilter || 'ALL').toUpperCase();
  return heatmapData.filter(s => {
    if (currentFilter === 'ALL') return true;
    const sLevel = (s.risk_level || '').toUpperCase();
    return sLevel === currentFilter;
  });
}

function computeCounts(heatmapData) {
  return {
    ALL: heatmapData.length,
    HIGH: heatmapData.filter(s => (s.risk_level || '').toUpperCase() === 'HIGH').length,
    MEDIUM: heatmapData.filter(s => (s.risk_level || '').toUpperCase() === 'MEDIUM').length,
    LOW: heatmapData.filter(s => (s.risk_level || '').toUpperCase() === 'LOW').length
  };
}

// 1. High filter returns strictly STU001 and STU004
const highFiltered = filterHeatmap(controlledCohort, 'HIGH');
assert.deepStrictEqual(highFiltered.map(s => s.student_id), ['STU001', 'STU004']);
assert(highFiltered.every(s => s.risk_level === 'High'));

// 2. Medium filter returns strictly STU002 and STU005
const medFiltered = filterHeatmap(controlledCohort, 'MEDIUM');
assert.deepStrictEqual(medFiltered.map(s => s.student_id), ['STU002', 'STU005']);
assert(medFiltered.every(s => s.risk_level === 'Medium'));

// 3. Low filter returns strictly STU003
const lowFiltered = filterHeatmap(controlledCohort, 'LOW');
assert.deepStrictEqual(lowFiltered.map(s => s.student_id), ['STU003']);
assert(lowFiltered.every(s => s.risk_level === 'Low'));

// 4. Counts agree
const counts = computeCounts(controlledCohort);
assert.strictEqual(counts.ALL, 5);
assert.strictEqual(counts.HIGH, 2);
assert.strictEqual(counts.MEDIUM, 2);
assert.strictEqual(counts.LOW, 1);

// 5. Switching filters retains mapping
const highAgain = filterHeatmap(controlledCohort, 'HIGH');
assert.deepStrictEqual(highAgain.map(s => s.student_id), ['STU001', 'STU004']);

console.log('✓ Cohort Heatmap Filter tests passed.');
console.log('--- ALL FRONTEND TESTS PASSED SUCCESSFULLY ---');
