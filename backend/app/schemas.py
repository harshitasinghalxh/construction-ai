"""Strict JSON contracts shared by the backend and the React frontend."""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field

Severity = Literal["low", "medium", "high", "critical"]


class SafetyIssue(BaseModel):
    category: str = Field(description="e.g. missing helmet, unsafe scaffold, open edge")
    description: str
    severity: Severity
    recommendation: str


class SafetyReport(BaseModel):
    overall_risk: Severity
    compliance_score: int = Field(ge=0, le=100)
    issues: List[SafetyIssue]
    summary: str


class CrackReport(BaseModel):
    crack_detected: bool
    crack_type: Literal["none", "hairline", "shrinkage", "settlement", "structural", "thermal", "other"]
    severity: Severity
    estimated_width_mm: Optional[float] = None
    probable_causes: List[str]
    recommended_actions: List[str]
    needs_engineer_inspection: bool
    summary: str


class ValuationRequest(BaseModel):
    location: str
    property_type: Literal["apartment", "villa", "plot", "commercial"]
    area_sqft: float = Field(gt=0)
    age_years: int = Field(ge=0, default=0)
    bedrooms: int = Field(ge=0, default=0)
    amenities: List[str] = []
    notes: str = ""


class ValuationReport(BaseModel):
    estimated_value_inr: float
    low_estimate_inr: float
    high_estimate_inr: float
    price_per_sqft_inr: float
    confidence: Literal["low", "medium", "high"]
    key_factors: List[str]
    risks: List[str]
    summary: str


class PlanRequest(BaseModel):
    project_name: str
    project_type: str = "residential building"
    area_sqft: float = Field(gt=0)
    floors: int = Field(ge=1, default=1)
    budget_inr: Optional[float] = None
    deadline_months: Optional[int] = None
    notes: str = ""


class Phase(BaseModel):
    name: str
    duration_weeks: int
    tasks: List[str]
    estimated_cost_inr: float
    dependencies: List[str]


class ProjectPlan(BaseModel):
    total_duration_weeks: int
    total_estimated_cost_inr: float
    phases: List[Phase]
    key_risks: List[str]
    summary: str


class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []
    mode: Literal["site_assistant", "knowledge"] = "site_assistant"


class ChatReply(BaseModel):
    answer: str
    action_items: List[str]
    references: List[str] = Field(description="Standards/codes mentioned, e.g. IS 456, NBC 2016")


class WeatherRequest(BaseModel):
    city: str
    activity: str = "general site work"


class WeatherAdvisory(BaseModel):
    city: str
    current_temp_c: float
    wind_kmh: float
    rain_mm_next_24h: float
    go_no_go: Literal["go", "caution", "no_go"]
    advisories: List[str]
    suggested_schedule_changes: List[str]
