import pandas as pd
import numpy as np

df = pd.read_csv('data/student_dataset.csv')

print("=== CHECKING COMPONENT SUM ===")
comps = ['QuizTotal', 'Project', 'Midterm', 'Final', 'Attendance', 'Participation']
sum_comps = df[comps].sum(axis=1)
diff = (df['FinalGrade'] - sum_comps).abs()
print("Max absolute difference between FinalGrade and sum(QuizTotal, Project, Midterm, Final, Attendance, Participation):", diff.max())
print("Mean absolute difference:", diff.mean())
print("Matches exactly within 0.0001:", (diff < 0.0001).sum(), "out of", len(df))

print("\n=== SAMPLE DIFFERENCES ===")
sample_df = pd.DataFrame({
    'StudentID': df['StudentID'],
    'FinalGrade': df['FinalGrade'],
    'Sum_Components': sum_comps,
    'Diff': df['FinalGrade'] - sum_comps
})
print(sample_df.head(10))

print("\n=== GRADE DISTRIBUTION & RISK TIERS ===")
print("FinalGrade min:", df['FinalGrade'].min(), "max:", df['FinalGrade'].max(), "mean:", df['FinalGrade'].mean())
# Academic risk classification tiers in higher ed:
# Under 60 (or Fail / F), 60-70 (Marginal / D-C), 70-80 (Satisfactory / C-B), 80+ (Good-Excellent / A)
# In student retention / early-warning systems:
# High Risk (At-Risk / Failing / struggling): FinalGrade < 70 (or < 60)
# Let's inspect percentiles and typical grade thresholds
for thresh in [50, 60, 65, 70, 75, 80]:
    print(f"FinalGrade < {thresh}: {(df['FinalGrade'] < thresh).sum()} ({(df['FinalGrade'] < thresh).mean()*100:.1f}%)")
