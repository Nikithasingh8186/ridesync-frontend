"""Pydantic request/response schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# ---------- Auth ----------

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


# ---------- Rides ----------

class RideCreate(BaseModel):
    origin_address: str
    origin_lat: float
    origin_lng: float
    destination_address: str
    destination_lat: float
    destination_lng: float
    departure_time: datetime
    available_seats: int = 3
    cost_per_person: Optional[float] = None


class RideOut(BaseModel):
    id: int
    driver: UserOut
    origin_address: str
    origin_lat: float
    origin_lng: float
    destination_address: str
    destination_lat: float
    destination_lng: float
    departure_time: datetime
    available_seats: int
    cost_per_person: Optional[float]
    status: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- Ride Requests ----------

class RideRequestCreate(BaseModel):
    ride_id: int


class RideRequestOut(BaseModel):
    id: int
    ride: RideOut
    passenger: UserOut
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RideRequestStatusUpdate(BaseModel):
    status: str  # "accepted" | "declined" | "cancelled"


class RideStatusUpdate(BaseModel):
    status: str  # "in_progress" | "completed" | "cancelled"


# ---------- Stats ----------

class StatsPeriod(BaseModel):
    total_rides: int
    total_distance_km: float
    co2_saved_kg: float
    fuel_saved_liters: float
    traffic_reduction_percent: float
    total_savings: float


class UserStats(BaseModel):
    weekly: StatsPeriod
    monthly: StatsPeriod
    total: StatsPeriod


# ---------- AI ----------

class AISuggestionRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    preferred_departure: str  # e.g. "08:30"


class AIChatRequest(BaseModel):
    question: str
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
