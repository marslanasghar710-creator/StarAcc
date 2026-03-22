from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.api.deps.rbac import require_permission
from app.core.enums import EmployeeStatus
from app.db.session import get_db
from app.schemas.payroll import (
    EmployeeCreateRequest,
    EmployeeListResponse,
    EmployeePayrollHistoryResponse,
    EmployeeResponse,
    EmployeeUpdateRequest,
    PayrollDeductionTypeCreateRequest,
    PayrollDeductionTypeListResponse,
    PayrollDeductionTypeResponse,
    PayrollDeductionTypeUpdateRequest,
    PayrollEarningTypeCreateRequest,
    PayrollEarningTypeListResponse,
    PayrollEarningTypeResponse,
    PayrollEarningTypeUpdateRequest,
    PayrollEntryDetailResponse,
    PayrollEntryListResponse,
    PayrollLiabilitiesResponse,
    PayrollPeriodCreateRequest,
    PayrollPeriodListResponse,
    PayrollPeriodResponse,
    PayrollRunCalculateRequest,
    PayrollRunCreateRequest,
    PayrollRunReverseRequest,
    PayrollRunListResponse,
    PayrollRunResponse,
    PayrollSummaryResponse,
)
from app.services.payroll_service import PayrollService

router = APIRouter(prefix="/organizations/{organization_id}", tags=["payroll"])


@router.post("/employees", response_model=EmployeeResponse)
def create_employee(organization_id: str, payload: EmployeeCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("employees.manage")), db: Session = Depends(get_db)):
    return PayrollService(db).create_employee(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/employees", response_model=EmployeeListResponse)
def list_employees(organization_id: str, status: EmployeeStatus | None = Query(None), _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return EmployeeListResponse(items=PayrollService(db).list_employees(organization_id, status=status))


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
def get_employee(organization_id: str, employee_id: UUID, _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return PayrollService(db).get_employee(organization_id, employee_id)


@router.get("/employees/{employee_id}/payroll-history", response_model=EmployeePayrollHistoryResponse)
def employee_payroll_history(organization_id: str, employee_id: UUID, _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return EmployeePayrollHistoryResponse(items=PayrollService(db).employee_history(organization_id, employee_id))


@router.patch("/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee(organization_id: str, employee_id: UUID, payload: EmployeeUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("employees.manage")), db: Session = Depends(get_db)):
    return PayrollService(db).update_employee(organization_id, employee_id, current_user.id, payload.model_dump(exclude_none=True))


@router.delete("/employees/{employee_id}")
def archive_employee(organization_id: str, employee_id: UUID, current_user=Depends(get_current_user), _=Depends(require_permission("employees.manage")), db: Session = Depends(get_db)):
    PayrollService(db).archive_employee(organization_id, employee_id, current_user.id)
    return {"message": "archived"}


@router.post("/payroll-earning-types", response_model=PayrollEarningTypeResponse)
def create_earning_type(organization_id: str, payload: PayrollEarningTypeCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("payroll.create")), db: Session = Depends(get_db)):
    return PayrollService(db).create_earning_type(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/payroll-earning-types", response_model=PayrollEarningTypeListResponse)
def list_earning_types(organization_id: str, _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return PayrollEarningTypeListResponse(items=PayrollService(db).list_earning_types(organization_id))


@router.patch("/payroll-earning-types/{earning_type_id}", response_model=PayrollEarningTypeResponse)
def update_earning_type(organization_id: str, earning_type_id: UUID, payload: PayrollEarningTypeUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("payroll.create")), db: Session = Depends(get_db)):
    return PayrollService(db).update_earning_type(organization_id, earning_type_id, current_user.id, payload.model_dump(exclude_none=True))


@router.post("/payroll-deduction-types", response_model=PayrollDeductionTypeResponse)
def create_deduction_type(organization_id: str, payload: PayrollDeductionTypeCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("payroll.create")), db: Session = Depends(get_db)):
    return PayrollService(db).create_deduction_type(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/payroll-deduction-types", response_model=PayrollDeductionTypeListResponse)
def list_deduction_types(organization_id: str, _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return PayrollDeductionTypeListResponse(items=PayrollService(db).list_deduction_types(organization_id))


@router.patch("/payroll-deduction-types/{deduction_type_id}", response_model=PayrollDeductionTypeResponse)
def update_deduction_type(organization_id: str, deduction_type_id: UUID, payload: PayrollDeductionTypeUpdateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("payroll.create")), db: Session = Depends(get_db)):
    return PayrollService(db).update_deduction_type(organization_id, deduction_type_id, current_user.id, payload.model_dump(exclude_none=True))


@router.post("/payroll-periods", response_model=PayrollPeriodResponse)
def create_payroll_period(organization_id: str, payload: PayrollPeriodCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("payroll.create")), db: Session = Depends(get_db)):
    return PayrollService(db).create_period(organization_id, current_user.id, payload.model_dump())


@router.get("/payroll-periods", response_model=PayrollPeriodListResponse)
def list_payroll_periods(organization_id: str, _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return PayrollPeriodListResponse(items=PayrollService(db).list_periods(organization_id))


@router.get("/payroll-periods/{period_id}", response_model=PayrollPeriodResponse)
def get_payroll_period(organization_id: str, period_id: UUID, _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return PayrollService(db).get_period(organization_id, period_id)


@router.post("/payroll-runs", response_model=PayrollRunResponse)
def create_payroll_run(organization_id: str, payload: PayrollRunCreateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("payroll.create")), db: Session = Depends(get_db)):
    return PayrollService(db).create_run(organization_id, current_user.id, payload.model_dump(exclude_none=True))


@router.get("/payroll-runs", response_model=PayrollRunListResponse)
def list_payroll_runs(organization_id: str, _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return PayrollRunListResponse(items=PayrollService(db).list_runs(organization_id))


@router.get("/payroll-runs/{run_id}", response_model=PayrollRunResponse)
def get_payroll_run(organization_id: str, run_id: UUID, _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return PayrollService(db).get_run(organization_id, run_id)


@router.post("/payroll-runs/{run_id}/calculate", response_model=PayrollRunResponse)
def calculate_payroll_run(organization_id: str, run_id: UUID, payload: PayrollRunCalculateRequest, current_user=Depends(get_current_user), _=Depends(require_permission("payroll.calculate")), db: Session = Depends(get_db)):
    return PayrollService(db).calculate_run(organization_id, run_id, current_user.id, payload.model_dump())


@router.post("/payroll-runs/{run_id}/post", response_model=PayrollRunResponse)
def post_payroll_run(organization_id: str, run_id: UUID, current_user=Depends(get_current_user), _=Depends(require_permission("payroll.post")), db: Session = Depends(get_db)):
    return PayrollService(db).post_run(organization_id, run_id, current_user.id)


@router.post("/payroll-runs/{run_id}/reverse", response_model=PayrollRunResponse)
def reverse_payroll_run(organization_id: str, run_id: UUID, payload: PayrollRunReverseRequest, current_user=Depends(get_current_user), _=Depends(require_permission("payroll.post")), db: Session = Depends(get_db)):
    return PayrollService(db).reverse_run(organization_id, run_id, current_user.id, reason=payload.reason, reversal_date=payload.reversal_date)


@router.get("/payroll-runs/{run_id}/entries", response_model=PayrollEntryListResponse)
def list_payroll_entries(organization_id: str, run_id: UUID, _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return PayrollEntryListResponse(items=PayrollService(db).list_entries(organization_id, run_id))


@router.get("/payroll-entries/{entry_id}", response_model=PayrollEntryDetailResponse)
def get_payroll_entry(organization_id: str, entry_id: UUID, _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return PayrollService(db).get_entry_detail(organization_id, entry_id)


@router.get("/payroll-summary", response_model=PayrollSummaryResponse)
def payroll_summary(organization_id: str, _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return PayrollSummaryResponse(items=PayrollService(db).payroll_summary(organization_id))


@router.get("/payroll-liabilities", response_model=PayrollLiabilitiesResponse)
def payroll_liabilities(organization_id: str, _=Depends(require_permission("payroll.read")), db: Session = Depends(get_db)):
    return PayrollLiabilitiesResponse(items=PayrollService(db).payroll_liabilities(organization_id))
