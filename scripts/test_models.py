import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_validate, KFold, StratifiedKFold
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor, GradientBoostingClassifier
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, f1_score, classification_report
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
import xgboost as xgb

df = pd.read_csv('data/student_dataset.csv')

# Features available before the final exam (NON-LEAKING)
feature_cols = [
    'Gender',
    'Program',
    'YearLevel',
    'ClassTime',
    'QuizTotal',
    'Project',
    'Midterm',
    'Attendance',
    'Participation',
    'Assignment on time percent',
    'Page Views'
]

X = df[feature_cols].copy()
y_reg = df['FinalGrade'].copy()

# 3 Academic Outcome Tiers:
# High: >= 85 (Honors/Dean's List level)
# Medium: 70 - 84.99 (Satisfactory / Good standing)
# Low / At-Risk: < 70 (Academic Warning / Academic Risk / Interventions needed)
def grade_to_tier(g):
    if g >= 85.0:
        return 0 # "High"
    elif g >= 70.0:
        return 1 # "Medium"
    else:
        return 2 # "At-Risk"

tier_labels = ["High", "Medium", "At-Risk"]
y_clf = y_reg.apply(grade_to_tier)

print("=== DATASET OVERVIEW ===")
print(f"Total students: {len(df)}")
print(f"Feature count: {len(feature_cols)}")
print(f"Class distribution: {dict(zip(tier_labels, np.bincount(y_clf)))}")

# REGRESSION BENCHMARKING
print("\n=== REGRESSION BENCHMARKS (Predicting FinalGrade) ===")
X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X, y_reg, test_size=0.20, random_state=42)

reg_models = {
    "Linear Regression (Baseline)": Pipeline([
        ('scaler', StandardScaler()),
        ('reg', LinearRegression())
    ]),
    "Decision Tree Regressor": DecisionTreeRegressor(max_depth=4, random_state=42),
    "Random Forest Regressor": RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42),
    "Gradient Boosting Regressor": GradientBoostingRegressor(n_estimators=80, learning_rate=0.08, max_depth=3, random_state=42)
}

cv_kf = KFold(n_splits=5, shuffle=True, random_state=42)
for name, model in reg_models.items():
    cv_res = cross_validate(model, X_train_r, y_train_r, cv=cv_kf, scoring=['neg_mean_absolute_error', 'r2'])
    model.fit(X_train_r, y_train_r)
    preds = model.predict(X_test_r)
    mae = mean_absolute_error(y_test_r, preds)
    rmse = np.sqrt(mean_squared_error(y_test_r, preds))
    r2 = r2_score(y_test_r, preds)
    print(f"{name:32s} | CV R2: {np.mean(cv_res['test_r2']):.3f} | Test MAE: {mae:.2f} | Test RMSE: {rmse:.2f} | Test R2: {r2:.3f}")

# CLASSIFICATION BENCHMARKING
print("\n=== CLASSIFICATION BENCHMARKS (Predicting Academic Performance Tier) ===")
X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(X, y_clf, test_size=0.20, random_state=42, stratify=y_clf)

clf_models = {
    "Logistic Regression (Baseline)": Pipeline([
        ('scaler', StandardScaler()),
        ('clf', LogisticRegression(max_iter=1000, random_state=42))
    ]),
    "Decision Tree Classifier": DecisionTreeClassifier(max_depth=4, random_state=42),
    "Random Forest Classifier": RandomForestClassifier(n_estimators=100, max_depth=5, random_state=42),
    "Gradient Boosting Classifier": GradientBoostingClassifier(n_estimators=80, learning_rate=0.08, max_depth=3, random_state=42),
    "XGBoost Classifier": xgb.XGBClassifier(n_estimators=80, max_depth=3, learning_rate=0.08, eval_metric="mlogloss", random_state=42)
}

cv_skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
for name, model in clf_models.items():
    cv_res = cross_validate(model, X_train_c, y_train_c, cv=cv_skf, scoring=['accuracy', 'f1_macro', 'f1_weighted'])
    model.fit(X_train_c, y_train_c)
    preds = model.predict(X_test_c)
    acc = accuracy_score(y_test_c, preds)
    f1_mac = f1_score(y_test_c, preds, average='macro')
    f1_w = f1_score(y_test_c, preds, average='weighted')
    print(f"{name:32s} | CV Acc: {np.mean(cv_res['test_accuracy']):.3f} | Test Acc: {acc:.3f} | Macro F1: {f1_mac:.3f} | Weighted F1: {f1_w:.3f}")
