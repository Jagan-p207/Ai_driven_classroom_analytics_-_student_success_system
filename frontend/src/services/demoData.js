/**
 * Synthetic Demo Dataset for standalone Netlify deployment.
 * Provides fallback data for 130 students across Class CS101.
 */

const RAW_STUDENTS = [
  { id: "STU1001", name: "Elena Davis", email: "elena.davis90@university.edu", att: 94.4, score: 86.5, trend: 1.19, eng: 92.3, delay: 0.1, risk: "Low", alert: false },
  { id: "STU1002", name: "Grace Carter", email: "grace.carter97@university.edu", att: 95.6, score: 89.3, trend: -0.38, eng: 94.9, delay: 0.0, risk: "Low", alert: false },
  { id: "STU1003", name: "Charlotte Torres", email: "charlotte.torres18@university.edu", att: 78.9, score: 72.8, trend: 0.14, eng: 70.1, delay: 1.4, risk: "Medium", alert: true },
  { id: "STU1004", name: "Vikram Thompson", email: "vikram.thompson86@university.edu", att: 94.4, score: 87.0, trend: -0.18, eng: 92.8, delay: 0.1, risk: "Low", alert: false },
  { id: "STU1005", name: "Emily Young", email: "emily.young42@university.edu", att: 100.0, score: 86.9, trend: -0.11, eng: 94.0, delay: 0.1, risk: "Low", alert: false },
  { id: "STU1009", name: "Zara Flores", email: "zara.flores53@university.edu", att: 72.2, score: 72.2, trend: -2.45, eng: 69.8, delay: 1.2, risk: "Medium", alert: true },
  { id: "STU1012", name: "Uma Hall", email: "uma.hall43@university.edu", att: 61.1, score: 75.2, trend: -2.32, eng: 62.2, delay: 2.0, risk: "Medium", alert: true },
  { id: "STU1016", name: "Mason Hernandez", email: "mason.hernandez29@university.edu", att: 78.9, score: 63.2, trend: -1.99, eng: 67.6, delay: 1.6, risk: "Medium", alert: true },
  { id: "STU1018", name: "Ian Mitchell", email: "ian.mitchell77@university.edu", att: 40.0, score: 54.5, trend: -6.23, eng: 31.0, delay: 7.6, risk: "High", alert: true },
  { id: "STU1027", name: "Jessica Rodriguez", email: "jessica.rodriguez43@university.edu", att: 75.6, score: 73.4, trend: -1.33, eng: 64.8, delay: 2.3, risk: "Medium", alert: true },
  { id: "STU1034", name: "Jack Williams", email: "jack.williams53@university.edu", att: 58.9, score: 51.8, trend: -7.04, eng: 37.6, delay: 6.8, risk: "High", alert: true },
  { id: "STU1046", name: "Quinn Sanchez", email: "quinn.sanchez55@university.edu", att: 53.3, score: 58.6, trend: -4.28, eng: 38.0, delay: 7.9, risk: "High", alert: true },
  { id: "STU1052", name: "Hassan Allen", email: "hassan.allen67@university.edu", att: 56.7, score: 46.3, trend: -4.06, eng: 41.6, delay: 5.8, risk: "High", alert: true },
  { id: "STU1060", name: "Ishaan White", email: "ishaan.white17@university.edu", att: 53.3, score: 56.6, trend: -5.32, eng: 38.7, delay: 6.5, risk: "High", alert: true },
  { id: "STU1062", name: "Vikram Anderson", email: "vikram.anderson68@university.edu", att: 54.4, score: 46.1, trend: -6.20, eng: 33.6, delay: 8.4, risk: "High", alert: true },
  { id: "STU1067", name: "Ishaan Johnson", email: "ishaan.johnson84@university.edu", att: 46.7, score: 41.5, trend: -2.10, eng: 30.5, delay: 9.5, risk: "High", alert: true },
  { id: "STU1073", name: "Hannah Williams", email: "hannah.williams86@university.edu", att: 52.2, score: 53.7, trend: -2.73, eng: 37.0, delay: 7.1, risk: "High", alert: true },
  { id: "STU1086", name: "Kai Jones", email: "kai.jones19@university.edu", att: 50.0, score: 60.0, trend: -2.52, eng: 36.3, delay: 9.2, risk: "High", alert: true },
  { id: "STU1087", name: "Ian Lopez", email: "ian.lopez74@university.edu", att: 41.1, score: 45.3, trend: -4.77, eng: 31.1, delay: 6.5, risk: "High", alert: true },
  { id: "STU1089", name: "Carlos Wilson", email: "carlos.wilson57@university.edu", att: 57.8, score: 43.9, trend: -3.52, eng: 34.1, delay: 7.0, risk: "High", alert: true },
  { id: "STU1093", name: "Harper Sharma", email: "harper.sharma95@university.edu", att: 52.2, score: 49.5, trend: -7.13, eng: 33.9, delay: 7.3, risk: "High", alert: true },
  { id: "STU1098", name: "Mason Lopez", email: "mason.lopez53@university.edu", att: 65.6, score: 52.3, trend: -5.89, eng: 39.3, delay: 7.9, risk: "High", alert: true },
  { id: "STU1100", name: "Liam Walker", email: "liam.walker72@university.edu", att: 48.9, score: 41.3, trend: -4.69, eng: 30.2, delay: 6.0, risk: "High", alert: true },
  { id: "STU1102", name: "Oliver Sanchez", email: "oliver.sanchez45@university.edu", att: 38.9, score: 45.8, trend: -8.17, eng: 29.2, delay: 7.5, risk: "High", alert: true },
  { id: "STU1113", name: "Rohan Wilson", email: "rohan.wilson95@university.edu", att: 57.8, score: 42.9, trend: -4.77, eng: 37.4, delay: 7.2, risk: "High", alert: true },
  { id: "STU1120", name: "Maya Rodriguez", email: "maya.rodriguez99@university.edu", att: 48.9, score: 51.4, trend: -3.25, eng: 33.3, delay: 7.2, risk: "High", alert: true },
  { id: "STU1121", name: "David Thompson", email: "david.thompson14@university.edu", att: 56.7, score: 55.9, trend: -4.65, eng: 37.2, delay: 9.4, risk: "High", alert: true },
  { id: "STU1126", name: "Rahul Thomas", email: "rahul.thomas18@university.edu", att: 52.2, score: 51.6, trend: -4.55, eng: 35.7, delay: 5.7, risk: "High", alert: true }
];

// Generate 130 student items for complete classroom roster & heatmap
export function getDemoStudents() {
  const students = [...RAW_STUDENTS];
  
  // Fill remaining to 130
  for (let i = 1; i <= 102; i++) {
    const id = `STU${1000 + RAW_STUDENTS.length + i}`;
    const firstNames = ["Aarav", "Amara", "Benjamin", "Chloe", "David", "Ethan", "Fatima", "Gabriel", "Hannah", "Ishaan"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[i % lastNames.length];
    const score = +(75 + (i * 7) % 23).toFixed(1);
    const att = +(80 + (i * 11) % 20).toFixed(1);
    const eng = +((score * 0.5 + att * 0.5)).toFixed(1);
    
    students.push({
      student_id: id,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@university.edu`,
      class_id: "CS101",
      department: "Computer Science",
      risk_level: "Low",
      risk_score: +((100 - eng) / 100).toFixed(2),
      attendance_pct: att,
      avg_score: score,
      score_trend: +(((i % 5) - 2) * 0.8).toFixed(2),
      composite_engagement: eng,
      alert_flag: false,
      contributing_factors: [
        { factor: "avg_score", impact: 0.15, label: `Strong Academic Marks (${score}%)` }
      ],
      recommendations: ["Maintain current study trajectory."]
    });
  }

  return students.map(s => {
    const riskScore = s.risk_score !== undefined ? s.risk_score : (s.risk === "High" ? 0.88 : (s.risk === "Medium" ? 0.55 : 0.12));
    const factors = s.contributing_factors || [
      { factor: "attendance_pct", impact: -0.35, label: `Low Attendance (${s.att}%)` },
      { factor: "score_trend", impact: -0.28, label: `Declining Assessment Slope (${s.trend})` },
      { factor: "avg_submission_delay", impact: -0.18, label: `Frequent LMS Delays (${s.delay} days)` }
    ];
    const recs = s.recommendations || [
      "Schedule mandatory 1-on-1 academic advising",
      "Provide peer tutoring support for Midterm topics",
      "Set up automatic LMS assignment deadline SMS alerts"
    ];

    return {
      student_id: s.id || s.student_id,
      name: s.name,
      email: s.email,
      class_id: s.class_id || "CS101",
      department: s.department || "Computer Science",
      risk_level: s.risk || s.risk_level,
      risk_score: riskScore,
      attendance_pct: s.att || s.attendance_pct,
      avg_score: s.score || s.avg_score,
      score_trend: s.trend || s.score_trend,
      composite_engagement: s.eng || s.composite_engagement,
      alert_flag: s.alert !== undefined ? s.alert : (s.risk_level === "High" || s.risk_level === "Medium"),
      contributing_factors: factors,
      recommendations: recs
    };
  });
}

export function getDemoClassRiskSummary(classId = 'CS101') {
  const students = getDemoStudents();
  const highRiskAlerts = students.filter(s => s.risk_level === 'High' || s.risk_level === 'Medium');
  
  const riskCounts = { Low: 0, Medium: 0, High: 0 };
  let totalAtt = 0, totalScore = 0, totalEng = 0;

  students.forEach(s => {
    riskCounts[s.risk_level] = (riskCounts[s.risk_level] || 0) + 1;
    totalAtt += s.attendance_pct;
    totalScore += s.avg_score;
    totalEng += s.composite_engagement;
  });

  return {
    class_id: classId,
    total_students: students.length,
    risk_counts: riskCounts,
    alert_count: highRiskAlerts.length,
    avg_attendance: +(totalAtt / students.length).toFixed(1),
    avg_score: +(totalScore / students.length).toFixed(1),
    avg_engagement: +(totalEng / students.length).toFixed(1),
    heatmap_data: students,
    high_risk_alerts: highRiskAlerts.map(s => ({
      student_id: s.student_id,
      name: s.name,
      email: s.email,
      risk_level: s.risk_level,
      risk_score: s.risk_score,
      primary_driver: s.contributing_factors[0]?.label || "Severe Score Decline",
      recommendation: s.recommendations[0] || "Schedule advising session",
      attendance_pct: s.attendance_pct,
      avg_score: s.avg_score
    }))
  };
}

export function getDemoStudentRisk(studentId) {
  const students = getDemoStudents();
  const student = students.find(s => s.student_id === studentId) || students[0];

  return {
    student: {
      student_id: student.student_id,
      name: student.name,
      email: student.email,
      class_id: student.class_id,
      department: student.department,
      enrollment_date: "2026-01-15"
    },
    current_risk: {
      id: 1,
      student_id: student.student_id,
      computed_at: new Date().toISOString(),
      risk_level: student.risk_level,
      risk_score: student.risk_score,
      attendance_pct: student.attendance_pct,
      avg_score: student.avg_score,
      score_trend: student.score_trend,
      avg_submission_delay: 3.4,
      composite_engagement: student.composite_engagement,
      alert_flag: student.alert_flag,
      contributing_factors: student.contributing_factors,
      recommendations: student.recommendations
    },
    assessment_history: [
      { name: "Quiz 1", date: "2026-02-01", score_obtained: Math.min(100, student.avg_score + 8), max_score: 100, percentage: Math.min(100, student.avg_score + 8) },
      { name: "Quiz 2", date: "2026-02-15", score_obtained: student.avg_score, max_score: 100, percentage: student.avg_score },
      { name: "Midterm", date: "2026-03-01", score_obtained: Math.max(30, student.avg_score - 5), max_score: 100, percentage: Math.max(30, student.avg_score - 5) },
      { name: "Quiz 3", date: "2026-03-15", score_obtained: Math.max(25, student.avg_score + student.score_trend * 3), max_score: 100, percentage: Math.max(25, student.avg_score + student.score_trend * 3) }
    ],
    attendance_history: [
      { date: "2026-02-01", status: "Present", numeric_value: 1.0 },
      { date: "2026-02-05", status: student.attendance_pct > 75 ? "Present" : "Absent", numeric_value: student.attendance_pct > 75 ? 1.0 : 0.0 },
      { date: "2026-02-10", status: "Late", numeric_value: 0.5 },
      { date: "2026-02-15", status: student.attendance_pct > 60 ? "Present" : "Absent", numeric_value: student.attendance_pct > 60 ? 1.0 : 0.0 }
    ],
    recent_lms_activities: [
      { activity_type: "Assignment Submission", timestamp: "2026-03-10", delay_days: 2.5, completion_status: "Completed", score_or_views: 85 },
      { activity_type: "Lecture Video View", timestamp: "2026-03-12", delay_days: 0.0, completion_status: "Completed", score_or_views: 45 }
    ]
  };
}

export function getDemoModelInfo() {
  return {
    status: "ready",
    data: {
      best_model_name: "Logistic Regression",
      primary_model: "Logistic Regression",
      trained_at: "2026-10-10",
      comparison_metrics: {
        "Logistic Regression": {
          cv_accuracy_mean: 1.0,
          cv_f1_macro_mean: 1.0,
          test_accuracy: 1.0,
          test_f1_macro: 1.0,
          test_f1_weighted: 1.0,
          confusion_matrix: [[16, 0, 0], [0, 6, 0], [0, 0, 4]],
          classification_report: {
            "Low": { precision: 1.0, recall: 1.0, "f1-score": 1.0, support: 16 },
            "Medium": { precision: 1.0, recall: 1.0, "f1-score": 1.0, support: 6 },
            "High": { precision: 1.0, recall: 1.0, "f1-score": 1.0, support: 4 }
          }
        },
        "Random Forest": {
          cv_accuracy_mean: 1.0,
          cv_f1_macro_mean: 1.0,
          test_accuracy: 1.0,
          test_f1_macro: 1.0,
          test_f1_weighted: 1.0,
          confusion_matrix: [[16, 0, 0], [0, 6, 0], [0, 0, 4]],
          classification_report: {
            "Low": { precision: 1.0, recall: 1.0, "f1-score": 1.0, support: 16 },
            "Medium": { precision: 1.0, recall: 1.0, "f1-score": 1.0, support: 6 },
            "High": { precision: 1.0, recall: 1.0, "f1-score": 1.0, support: 4 }
          }
        },
        "XGBoost": {
          cv_accuracy_mean: 0.961,
          cv_f1_macro_mean: 0.943,
          test_accuracy: 1.0,
          test_f1_macro: 1.0,
          test_f1_weighted: 1.0,
          confusion_matrix: [[16, 0, 0], [0, 6, 0], [0, 0, 4]],
          classification_report: {
            "Low": { precision: 1.0, recall: 1.0, "f1-score": 1.0, support: 16 },
            "Medium": { precision: 1.0, recall: 1.0, "f1-score": 1.0, support: 6 },
            "High": { precision: 1.0, recall: 1.0, "f1-score": 1.0, support: 4 }
          }
        }
      },
      global_feature_importances: {
        "completion_rate": 16.31,
        "avg_score": 10.45,
        "composite_engagement": 10.11,
        "avg_submission_delay": 9.68,
        "max_submission_delay": 9.59,
        "recent_score": 9.57,
        "attendance_pct": 8.90,
        "attendance_trend": 6.27,
        "missing_submissions_count": 6.27,
        "score_trend": 4.48,
        "score_std": 4.30,
        "submission_delay_trend": 4.07
      },
      has_shap: true
    }
  };
}

export function getDemoHistoricalAnalytics() {
  return {
    class_id: "CS101",
    milestone_progression: [
      { milestone: "Week 2 - Diagnostic Quiz", date: "2026-02-01", Low: 105, Medium: 18, High: 7, avg_score: 84.2, avg_attendance: 94.5 },
      { milestone: "Week 4 - Assessment 1", date: "2026-02-15", Low: 96, Medium: 22, High: 12, avg_score: 80.5, avg_attendance: 90.1 },
      { milestone: "Week 8 - Midterm Exam", date: "2026-03-01", Low: 88, Medium: 26, High: 16, avg_score: 75.8, avg_attendance: 85.3 },
      { milestone: "Week 12 - Project Milestone", date: "2026-03-20", Low: 82, Medium: 28, High: 20, avg_score: 74.1, avg_attendance: 83.2 }
    ],
    attendance_trajectory: [
      { week: "W1", average_attendance: 96.2 },
      { week: "W2", average_attendance: 94.5 },
      { week: "W3", average_attendance: 92.8 },
      { week: "W4", average_attendance: 90.1 },
      { week: "W5", average_attendance: 88.4 },
      { week: "W6", average_attendance: 87.0 },
      { week: "W7", average_attendance: 86.2 },
      { week: "W8", average_attendance: 85.3 },
      { week: "W9", average_attendance: 84.7 },
      { week: "W10", average_attendance: 83.9 },
      { week: "W11", average_attendance: 83.5 },
      { week: "W12", average_attendance: 83.2 }
    ],
    risk_mobility: {
      escalated: 14,
      improved: 9,
      stable: 107
    },
    intervention_metrics: {
      total_interventions: 24,
      resolved: 11,
      in_progress: 10,
      escalated: 3,
      avg_resolution_days: 8.5
    }
  };
}
