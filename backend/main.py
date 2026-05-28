import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AlgoSNS", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import profile, posts, search, recommend, comments

app.include_router(profile.router)
app.include_router(posts.router)
app.include_router(search.router)
app.include_router(recommend.router)
app.include_router(comments.router)


@app.get("/")
def root():
    return {"message": "AlgoSNS API is running"}
