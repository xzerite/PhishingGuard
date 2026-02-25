from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from analyzer import analyze_url
import uvicorn

app = FastAPI(title="PhishGuard API")

class URLRequest(BaseModel):
    url: str

class AnalysisResult(BaseModel):
    url: str
    is_phishing: bool
    risk_score: int
    reasons: list[str]

@app.get("/")
async def root():
    return {"message": "PhishGuard API is running"}

@app.post("/analyze", response_model=AnalysisResult)
async def analyze(request: URLRequest):
    try:
        results = analyze_url(request.url)
        return {
            "url": request.url,
            **results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
