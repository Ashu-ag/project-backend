# Classroom App OCR & AI Search Service

This is the Python microservice that provides Advanced Multi-Format OCR and Semantic Search for the Classroom App.

## Setup Instructions

1. Ensure you have Python 3.8+ installed.
2. Install Tesseract OCR on your system (required for image/scanned PDF text extraction).
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Service

Start the Flask microservice on port 5001:

```bash
python app.py
```

## Integration Details

- **Indexing**: When a file is uploaded in the Classroom App, the Node.js backend automatically sends the file path to `http://localhost:5001/api/index` for AI extraction and indexing.
- **Searching**: When a user searches in the React app, the Node.js backend queries `http://localhost:5001/api/search` to get semantic matches and highlighted excerpts, returning them combined with the database records.
