"""
RideSync FastAPI application.

Routes:
  POST /auth/register       — create account
  POST /auth/login          — get JWT token
  GET  /users/me            — current user profile

  POST /rides               — offer a ride
  GET  /rides               — list active rides (with optional filters)
  GET  /rides/my            — rides offered by current user
  DELETE /rides/{id}        — cancel a ride

  POST /requests            — request to join a ride
  GET  /requests/my         — requests made by current user
  PATCH /requests/{id}      — accept or decline a request (driver only)

  GET  /stats               — current user's cumulative stats
  POST /ai/suggestions      — AI-powered ride suggestions
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, Depends, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db, init_db, settings
from matching import find_matching_rides, estimate_cost_share, estimate_co2_saved_kg, haversine
from ai_suggestions import get_ride_suggestions
from ai_chat import get_ai_answer

REQUEST_ACTIVE_STATUSES = (
    models.RequestStatus.pending.value,
    models.RequestStatus.accepted.value,
    models.RequestStatus.in_progress.value,
)

RIDE_STATUS_TRANSITIONS = {
    models.RideStatus.pending.value: {
        models.RideStatus.in_progress.value,
        models.RideStatus.cancelled.value,
    },
    models.RideStatus.in_progress.value: {
        models.RideStatus.completed.value,
        models.RideStatus.cancelled.value,
    },
}

# ---------- App setup ----------

app = FastAPI(title="RideSync API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()


# ---------- Auth utilities ----------

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


# ---------- Auth routes ----------

@app.post("/auth/register", response_model=schemas.UserOut, status_code=201)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.post("/auth/login", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"access_token": create_access_token(user.id)}


@app.get("/users/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ---------- Ride routes ----------

@app.post("/rides", response_model=schemas.RideOut, status_code=201)
def offer_ride(
    payload: schemas.RideCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ride = models.Ride(**payload.model_dump(), driver_id=current_user.id)
    db.add(ride)
    db.commit()
    db.refresh(ride)
    return ride


@app.get("/rides", response_model=list[schemas.RideOut])
def list_rides(
    origin_lat: Optional[float] = None,
    origin_lng: Optional[float] = None,
    destination_lat: Optional[float] = None,
    destination_lng: Optional[float] = None,
    departure_time: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if all(
        v is not None
        for v in [origin_lat, origin_lng, destination_lat, destination_lng, departure_time]
    ):
        return find_matching_rides(
            db, origin_lat, origin_lng, destination_lat, destination_lng,
            departure_time, exclude_user_id=current_user.id,
        )
    return db.query(models.Ride).filter(
        models.Ride.is_active == True,
        models.Ride.status == models.RideStatus.pending.value,
        models.Ride.driver_id != current_user.id,
    ).all()


@app.get("/rides/my", response_model=list[schemas.RideOut])
def my_rides(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Ride).filter(models.Ride.driver_id == current_user.id).all()


@app.delete("/rides/{ride_id}", status_code=204)
def cancel_ride(
    ride_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ride = db.query(models.Ride).filter(models.Ride.id == ride_id).first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your ride")
    ride.is_active = False
    ride.status = models.RideStatus.cancelled.value
    for req in ride.requests:
        if req.status in REQUEST_ACTIVE_STATUSES:
            req.status = models.RequestStatus.cancelled.value
    db.commit()


@app.patch("/rides/{ride_id}/status", response_model=schemas.RideOut)
def update_ride_status(
    ride_id: int,
    payload: schemas.RideStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ride = db.query(models.Ride).filter(models.Ride.id == ride_id).with_for_update().first()
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    if ride.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the driver can update this ride")

    try:
        next_status = models.RideStatus(payload.status).value
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ride status")

    allowed = RIDE_STATUS_TRANSITIONS.get(ride.status, set())
    if next_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot change ride from {ride.status} to {next_status}",
        )
    if next_status == models.RideStatus.in_progress.value and not any(
        req.status == models.RequestStatus.accepted.value for req in ride.requests
    ):
        raise HTTPException(status_code=400, detail="Accept at least one request before starting")

    ride.status = next_status
    ride.is_active = next_status == models.RideStatus.pending.value

    if next_status == models.RideStatus.in_progress.value:
        for req in ride.requests:
            if req.status == models.RequestStatus.accepted.value:
                req.status = models.RequestStatus.in_progress.value
    elif next_status == models.RideStatus.completed.value:
        for req in ride.requests:
            if req.status in (
                models.RequestStatus.accepted.value,
                models.RequestStatus.in_progress.value,
            ):
                req.status = models.RequestStatus.completed.value
            elif req.status == models.RequestStatus.pending.value:
                req.status = models.RequestStatus.cancelled.value
    elif next_status == models.RideStatus.cancelled.value:
        for req in ride.requests:
            if req.status in REQUEST_ACTIVE_STATUSES:
                req.status = models.RequestStatus.cancelled.value

    db.commit()
    db.refresh(ride)
    return ride


# ---------- Ride request routes ----------

@app.post("/requests", response_model=schemas.RideRequestOut, status_code=201)
def create_request(
    payload: schemas.RideRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ride = db.query(models.Ride).filter(models.Ride.id == payload.ride_id).first()
    if not ride or not ride.is_active or ride.status != models.RideStatus.pending.value:
        raise HTTPException(status_code=404, detail="Ride not found or inactive")
    if ride.driver_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot request your own ride")

    existing = db.query(models.RideRequest).filter(
        models.RideRequest.ride_id == payload.ride_id,
        models.RideRequest.passenger_id == current_user.id,
        models.RideRequest.status.in_(REQUEST_ACTIVE_STATUSES),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already requested this ride")

    req = models.RideRequest(ride_id=payload.ride_id, passenger_id=current_user.id)
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@app.get("/requests/my", response_model=list[schemas.RideRequestOut])
def my_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.RideRequest).filter(
        models.RideRequest.passenger_id == current_user.id
    ).all()


@app.get("/requests/received", response_model=list[schemas.RideRequestOut])
def received_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.RideRequest)
        .join(models.Ride)
        .filter(models.Ride.driver_id == current_user.id)
        .all()
    )

@app.patch("/requests/{request_id}", response_model=schemas.RideRequestOut)
def update_request_status(
    request_id: int,
    payload: schemas.RideRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = (
        db.query(models.RideRequest)
        .filter(models.RideRequest.id == request_id)
        .with_for_update()
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    try:
        next_status = models.RequestStatus(payload.status).value
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid request status")

    if next_status not in (
        models.RequestStatus.accepted.value,
        models.RequestStatus.declined.value,
        models.RequestStatus.cancelled.value,
    ):
        raise HTTPException(
            status_code=400,
            detail="Status must be accepted, declined, or cancelled",
        )

    is_driver = req.ride.driver_id == current_user.id
    is_passenger_cancel = (
        req.passenger_id == current_user.id
        and next_status == models.RequestStatus.cancelled.value
        and req.status in (models.RequestStatus.pending.value, models.RequestStatus.accepted.value)
    )
    if not is_driver and not is_passenger_cancel:
        raise HTTPException(status_code=403, detail="Not allowed to update this request")
    if is_driver and req.status != models.RequestStatus.pending.value:
        raise HTTPException(status_code=400, detail=f"Request is already {req.status}")
    if req.ride.status != models.RideStatus.pending.value or not req.ride.is_active:
        raise HTTPException(status_code=400, detail="Ride is not accepting request changes")
    if next_status == models.RequestStatus.accepted.value and req.ride.available_seats <= 0:
        raise HTTPException(status_code=400, detail="No seats available")

    was_accepted = req.status == models.RequestStatus.accepted.value
    req.status = next_status
    if next_status == models.RequestStatus.accepted.value:
        req.ride.available_seats -= 1
    elif next_status == models.RequestStatus.cancelled.value and was_accepted:
        req.ride.available_seats += 1
    db.commit()
    db.refresh(req)
    return req


# ---------- Stats route ----------

@app.get("/stats", response_model=schemas.UserStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.utcnow()
    periods = {
        "weekly": now - timedelta(days=7),
        "monthly": now - timedelta(days=30),
        "total": None,
    }

    def ride_distance(ride: models.Ride) -> float:
        return haversine(
            ride.origin_lat,
            ride.origin_lng,
            ride.destination_lat,
            ride.destination_lng,
        )

    def build_period_stats(start: Optional[datetime]) -> schemas.StatsPeriod:
        passenger_requests_query = db.query(models.RideRequest).filter(
            models.RideRequest.passenger_id == current_user.id,
            models.RideRequest.status == models.RequestStatus.completed.value,
        )
        driver_rides_query = db.query(models.Ride).filter(
            models.Ride.driver_id == current_user.id,
            models.Ride.status == models.RideStatus.completed.value,
        )
        if start:
            passenger_requests_query = passenger_requests_query.filter(
                models.RideRequest.created_at >= start
            )
            driver_rides_query = driver_rides_query.filter(models.Ride.created_at >= start)

        passenger_requests = passenger_requests_query.all()
        driver_rides = driver_rides_query.all()

        total_rides = len(passenger_requests) + len(driver_rides)
        total_distance = 0.0
        co2_saved = 0.0
        fuel_saved = 0.0
        total_savings = 0.0
        shared_segments = 0

        for req in passenger_requests:
            distance = ride_distance(req.ride)
            total_distance += distance
            co2_saved += distance * 0.21
            fuel_saved += distance / 14.0
            total_savings += estimate_cost_share(distance, passengers=2)
            shared_segments += 1

        for ride in driver_rides:
            completed_passengers = [
                req for req in ride.requests if req.status == models.RequestStatus.completed.value
            ]
            if not completed_passengers:
                continue
            distance = ride_distance(ride)
            passenger_count = len(completed_passengers)
            total_distance += distance
            co2_saved += estimate_co2_saved_kg(distance, passengers=passenger_count + 1)
            fuel_saved += (distance / 14.0) * passenger_count
            total_savings += estimate_cost_share(distance, passengers=passenger_count + 1)
            shared_segments += passenger_count

        traffic_reduction = 0.0
        if total_rides:
            traffic_reduction = min(
                100.0,
                (shared_segments / (total_rides + shared_segments)) * 100,
            )

        return schemas.StatsPeriod(
            total_rides=total_rides,
            total_distance_km=round(total_distance, 2),
            co2_saved_kg=round(co2_saved, 2),
            fuel_saved_liters=round(fuel_saved, 2),
            traffic_reduction_percent=round(traffic_reduction, 1),
            total_savings=round(total_savings, 2),
        )

    return schemas.UserStats(
        weekly=build_period_stats(periods["weekly"]),
        monthly=build_period_stats(periods["monthly"]),
        total=build_period_stats(periods["total"]),
    )


# ---------- AI suggestions route ----------

@app.post("/ai/suggestions")
def ai_suggestions(
    payload: schemas.AISuggestionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    x_ai_mode: str = Header(default="cloud", alias="X-AI-Mode"),
    x_ai_local_endpoint: str = Header(default="http://localhost:11434", alias="X-AI-Local-Endpoint"),
    x_ai_byok_key: str | None = Header(default=None, alias="X-AI-BYOK-Key"),
    accept_language: str = Header(default="en", alias="Accept-Language"),
):
    preferred_language = accept_language.split(",")[0].split("-")[0].strip().lower() or "en"
    from datetime import date
    today = datetime.combine(
        date.today(),
        datetime.strptime(payload.preferred_departure, "%H:%M").time(),
    )

    matches = find_matching_rides(
        db,
        payload.origin_lat, payload.origin_lng,
        payload.destination_lat, payload.destination_lng,
        today,
        exclude_user_id=current_user.id,
    )

    rides_for_ai = [
        {
            "id": r.id,
            "driver_name": r.driver.full_name,
            "departure_time": r.departure_time.isoformat(),
            "origin_address": r.origin_address,
            "available_seats": r.available_seats,
            "cost_per_person": r.cost_per_person,
        }
        for r in matches[:5]
    ]

    suggestion = get_ride_suggestions(
        origin_address=f"{payload.origin_lat},{payload.origin_lng}",
        destination_address=f"{payload.destination_lat},{payload.destination_lng}",
        preferred_departure=payload.preferred_departure,
        available_rides=rides_for_ai,
        language=preferred_language,
        ai_mode=x_ai_mode,
        local_endpoint=x_ai_local_endpoint,
        byok_key=x_ai_byok_key,
    )

    return {"matches": rides_for_ai, "suggestion": suggestion}


@app.post("/ai/chat")
def ai_chat(
    payload: schemas.AIChatRequest,
    current_user: models.User = Depends(get_current_user),
    x_ai_mode: str = Header(default="cloud", alias="X-AI-Mode"),
    x_ai_local_endpoint: str = Header(default="http://localhost:11434", alias="X-AI-Local-Endpoint"),
    x_ai_byok_key: str | None = Header(default=None, alias="X-AI-BYOK-Key"),
    accept_language: str = Header(default="en", alias="Accept-Language"),
):
    preferred_language = accept_language.split(",")[0].split("-")[0].strip().lower() or "en"
    answer_payload = get_ai_answer(
        payload.question,
        language=preferred_language,
        ai_mode=x_ai_mode,
        local_endpoint=x_ai_local_endpoint,
        byok_key=x_ai_byok_key,
    )
    return {"answer": answer_payload["answer"]}
