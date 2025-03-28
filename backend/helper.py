from fastapi import HTTPException
import requests
import os, re
import json

def call_gemini_api(code: str):
    """
    Calls the Gemini API to analyze the given code and returns suggestions.

    Args:
        code: The code to analyze.

    Returns:
        A list of dictionaries containing suggestions, or raises HTTPException if the API call fails.
    """

    system_prompt = """
    You are a helpful AI code reviewer.

    Your job is to analyze the given source code and return specific suggestions for improvement, bugs, or syntax errors. Respond strictly in this JSON format:

    [
    {{
        "line": <line_number_starting_from_0>,
        "text": "<suggestion_text>",
        "type": "<one_of: 'error' | 'warning' | 'info'>"
    }},
    ...
    ]

    Be concise and relevant. Only include suggestions that are helpful to the programmer. Do not include explanations or any other text outside the JSON array.

    Here is the code to analyze:
    
    ```
    {{code_here}}
    ```

    """

    API_KEY = os.getenv("GOOGLE_GEMINI_API_KEY")

    if not API_KEY:
        raise ValueError("GOOGLE_GEMINI_API_KEY environment variable not set.")

    headers = {
        "Content-Type": "application/json",
    }
    body = {
        "contents": [{
            "parts": [{
                "text": system_prompt.replace("{{code_here}}", code)
            }]
        }],
        "safetySettings": [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_NONE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_NONE"
            }
        ]
    }

    try:
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={API_KEY}",
            headers=headers,
            json=body,
            timeout=20 #add a timeout.
        )
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

        response_json = response.json()

        # Extract the text from the response
        if "candidates" in response_json and response_json["candidates"] and "content" in response_json["candidates"][0] and "parts" in response_json["candidates"][0]["content"] and response_json["candidates"][0]["content"]["parts"]:
            text = response_json["candidates"][0]["content"]["parts"][0]["text"]
            text = re.sub(r"^\s*```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```\s*$", "", text) 
            # Parse the JSON string into a Python object
            try:
                suggestions = json.loads(text)
                return suggestions
            except json.JSONDecodeError:
                raise HTTPException(status_code=500, detail=f"Gemini API response parsing error: Could not decode JSON. Raw response: {text}")

        else:
            raise HTTPException(status_code=500, detail=f"Gemini API response missing expected fields: {response_json}")

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Gemini API error: {e}")
    except (KeyError, IndexError) as e:
        raise HTTPException(status_code=500, detail=f"Gemini API response parsing error: {e}.  Raw response: {response.text if 'response' in locals() else 'No response'}")