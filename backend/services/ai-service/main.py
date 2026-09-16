from fastapi import FastAPI, HTTPException
from models import CoachRequest, QuestionConstraint, GeneratedQuestion, ValidationRequest
from llm_provider import LLMProvider, LLMProviderError
import json
import uvicorn
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Axly AI Service")
llm = LLMProvider()

@app.get("/health")
async def health_check():
    return {"status": "AI Service OK"}

@app.post("/coach")
async def ai_coach(request: CoachRequest):
    try:
        # Construct prompt from history
        history_text = "\n".join([f"{m.role}: {m.content}" for m in request.history])
        system_prompt = f"You are an AI DSA Coach. Help the user with the following problem context: {request.question_context}. Do not give them the full answer directly."
        
        response = await llm.generate_response(history_text, system_prompt)
        return {"response": response}
    except LLMProviderError as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.post("/generate", response_model=GeneratedQuestion)
async def generate_question(constraint: QuestionConstraint):
    try:
        system_prompt = "You are an expert DSA question generator. Output strictly valid JSON matching the required schema."
        prompt = f"Generate a {constraint.difficulty} level DSA question about {constraint.topic} using the {constraint.pattern or 'best'} pattern."
        
        response = await llm.generate_response(prompt, system_prompt)
        
        # In MVP with mocked LLM, we return a hardcoded response to satisfy Pydantic
        if "mocked AI response" in response:
            return GeneratedQuestion(
                title=f"Mocked {constraint.topic} Question",
                description="This is a mocked generated question description.",
                difficulty=constraint.difficulty,
                examples=[{"input": "a=1", "output": "b=2"}],
                constraints=["1 <= N <= 10^5"],
                starterCode={"javascript": "function solve() {}"}
            )
            
        # Real flow
        data = json.loads(response)
        return GeneratedQuestion(**data)
    except LLMProviderError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON")

@app.post("/validate")
async def validate_code(request: ValidationRequest):
    try:
        prompt = f"Validate the following {request.language} code for the problem: {request.question_context}. Code: \n{request.code}"
        response = await llm.generate_response(prompt, "You are a code reviewer. Point out flaws.")
        return {"feedback": response}
    except LLMProviderError as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.post("/embeddings")
async def get_embeddings(text: str):
    # Mocking embedding generation for duplicate detection
    return {"embedding": [0.1, 0.2, 0.3, 0.4]}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5005)
