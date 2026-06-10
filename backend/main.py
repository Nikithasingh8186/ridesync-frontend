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

from fastapi import FastAPI, Depends, HTTPException, status
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
    if all(v is not None for v in [origin_lat, origin_lng, destination_lat, destination_lng, departure_time]):
        return find_matching_rides(
            db, origin_lat, origin_lng, destination_lat, destination_lng,
            departure_time, exclude_user_id=current_user.id,
        )
    return db.query(models.Ride).filter(
        models.Ride.is_active == True,
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
    db.commit()


# ---------- Ride request routes ----------

@app.post("/requests", response_model=schemas.RideRequestOut, status_code=201)
def create_request(
    payload: schemas.RideRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ride = db.query(models.Ride).filter(models.Ride.id == payload.ride_id).first()
    if not ride or not ride.is_active:
        raise HTTPException(status_code=404, detail="Ride not found or inactive")
    if ride.driver_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot request your own ride")

    existing = db.query(models.RideRequest).filter(
        models.RideRequest.ride_id == payload.ride_id,
        models.RideRequest.passenger_id == current_user.id,
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


@app.patch("/requests/{request_id}", response_model=schemas.RideRequestOut)
def update_request_status(
    request_id: int,
    payload: schemas.RideRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    req = db.query(models.RideRequest).filter(models.RideRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    if req.ride.driver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the driver can update this request")

    if payload.status not in ("accepted", "declined"):
        raise HTTPException(status_code=400, detail="Status must be 'accepted' or 'declined'")

    req.status = payload.status
    if payload.status == "accepted":
        req.ride.available_seats = max(0, req.ride.available_seats - 1)
    db.commit()
    db.refresh(req)
    return req


# ---------- Stats route ----------

@app.get("/stats", response_model=schemas.UserStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    accepted_requests = db.query(models.RideRequest).filter(
        models.RideRequest.passenger_id == current_user.id,
        models.RideRequest.status == "accepted",
    ).all()

    total_rides = len(accepted_requests)
    total_savings = 0.0
    co2_saved = 0.0
    km_shared = 0.0

    for req in accepted_requests:
        ride = req.ride
        dist = haversine(
            ride.origin_lat, ride.origin_lng,
            ride.destination_lat, ride.destination_lng,
        )
        km_shared += dist
        total_savings += estimate_cost_share(dist, passengers=2)
        co2_saved += estimate_co2_saved_kg(dist, passengers=2)

    return schemas.UserStats(
        total_rides=total_rides,
        total_savings=round(total_savings, 2),
        co2_saved_kg=round(co2_saved, 3),
        km_shared=round(km_shared, 2),
    )


# ---------- AI suggestions route ----------

@app.post("/ai/suggestions")
def ai_suggestions(
    payload: schemas.AISuggestionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from datetime import date
    today = datetime.combine(date.today(), datetime.strptime(payload.preferred_departure, "%H:%M").time())

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
    )

    return {"matches": rides_for_ai, "suggestion": suggestion}