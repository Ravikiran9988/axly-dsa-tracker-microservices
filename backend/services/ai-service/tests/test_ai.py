import pytest
from fastapi.testclient import TestClient
from main import app
from llm_provider import LLMProvider, RateLimitError
from unittest.mock import patch

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "AI Service OK"}

def test_coach_endpoint():
    response = client.post("/coach", json={
        "history": [{"role": "user", "content": "Help me with Two Sum"}],
        "question_context": "Two Sum problem details"
    })
    assert response.status_code == 200
    assert "response" in response.json()

def test_generate_endpoint():
    response = client.post("/generate", json={
        "difficulty": "MEDIUM",
        "topic": "Graphs"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["difficulty"] == "MEDIUM"
    assert "title" in data
    assert "examples" in data

def test_validate_endpoint():
    response = client.post("/validate", json={
        "code": "def foo(): pass",
        "language": "python",
        "question_context": "Some context"
    })
    assert response.status_code == 200
    assert "feedback" in response.json()

@patch('llm_provider.LLMProvider._call_provider')
def test_fallback_logic(mock_call):
    # Setup mock to fail first call, succeed second call
    mock_call.side_effect = [
        Exception("Primary failed"),
        "Fallback response"
    ]
    
    # We test the class directly instead of via the endpoint for fine-grained control
    import asyncio
    llm = LLMProvider()
    response = asyncio.run(llm.generate_response("test prompt"))
    assert response == "Fallback response"
    assert mock_call.call_count == 2
