import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from core import persistence


@asynccontextmanager
async def lifespan(app: FastAPI):
    persistence.load_all()
    yield
    persistence.save_all()


app = FastAPI(title="AlgoSNS", version="0.2.0", lifespan=lifespan)

_default_origins = "http://localhost:5173,http://localhost:5174,http://localhost:5175"
_origins_raw = os.getenv("ALLOWED_ORIGINS", _default_origins)
allowed_origins = [o.strip() for o in _origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


@app.middleware("http")
async def persist_on_write(request: Request, call_next):
    response = await call_next(request)
    if request.method in _MUTATING_METHODS and 200 <= response.status_code < 300:
        try:
            persistence.save_all()
        except Exception:
            pass
    return response


from routers import profile, posts, search, recommend, comments, auth, messages

app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(posts.router)
app.include_router(search.router)
app.include_router(recommend.router)
app.include_router(comments.router)
app.include_router(messages.router)


@app.get("/")
def root():
    return {"message": "AlgoSNS API is running"}
