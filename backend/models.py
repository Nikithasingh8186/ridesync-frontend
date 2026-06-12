"""SQLAlchemy ORM models."""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    Boolean, ForeignKey,
)
from sqlalchemy.orm import relationship
import enum

from database import Base


class RequestStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    declined = "declined"


class RideStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    rides_offered = relationship("Ride", back_populates="driver", foreign_keys="Ride.driver_id")
    ride_requests = relationship("RideRequest", back_populates="passenger")


class Ride(Base):
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Origin
    origin_address = Column(String, nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)

    # Destination
    destination_address = Column(String, nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)

    departure_time = Column(DateTime, nullable=False)
    available_seats = Column(Integer, nullable=False, default=3)
    cost_per_person = Column(Float, nullable=True)
    status = Column(String, default=RideStatus.pending.value, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    driver = relationship("User", back_populates="rides_offered", foreign_keys=[driver_id])
    requests = relationship("RideRequest", back_populates="ride")


class RideRequest(Base):
    __tablename__ = "ride_requests"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, ForeignKey("rides.id"), nullable=False)
    passenger_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default=RequestStatus.pending.value)
    created_at = Column(DateTime, default=datetime.utcnow)

    ride = relationship("Ride", back_populates="requests")
    passenger = relationship("User", back_populates="ride_requests")
