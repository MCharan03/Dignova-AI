# ============================================================
# LEGACY TRAINING ROUTES — DEPRECATED
# ============================================================
# These routes used the old SimulatedPatient/TrainingSession models
# which have been replaced by TrainingScenario/TrainingReport.
# All active training endpoints are now in routes.py under:
#   - GET  /api/hospital/training/scenarios
#   - POST /api/hospital/training/scenarios
#   - PUT  /api/hospital/training/scenarios/{id}
#   - DELETE /api/hospital/training/scenarios/{id}
#   - POST /api/hospital/training/start/{id}
#   - POST /api/hospital/training/submit/{id}
#   - GET  /api/hospital/training/progress
#   - GET  /api/hospital/training/intern-performance
# ============================================================

from fastapi import APIRouter

router = APIRouter()
# No routes registered — kept for backward-compatible import in main.py if needed.
