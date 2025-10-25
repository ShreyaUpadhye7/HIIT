import os
from flask import Flask, request, jsonify
from flask_cors import CORS
# from werkzeug.utils import secure_filename  # No longer needed
from analyzer import HandwritingAnalyzer
from io import BytesIO

# Initialize the Flask application
app = Flask(__name__)

# --- Configuration ---
CORS(app) 
# REMOVED: UPLOAD_FOLDER configuration

# --- Load the Analyzer ---
print("Initializing the handwriting analyzer...")
MODELS_PATH = 'models'
try:
    handwriting_analyzer = HandwritingAnalyzer(MODELS_PATH)
    print("Analyzer initialized successfully.")
except Exception as e:
    print(f"FATAL: Could not initialize HandwritingAnalyzer. Error: {e}")
    handwriting_analyzer = None

# --- API Route ---
@app.route('/analyze', methods=['POST'])
def analyze_image():
    if handwriting_analyzer is None:
        return jsonify({"error": "Analyzer is not available due to an initialization error."}), 500

    # Check if a file was sent in the request
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file'] # This is a FileStorage object (in-memory)
    
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if file:
        try:
            # --- Perform the analysis IN MEMORY ---
            # Read the file's content into a BytesIO object
            # This makes it behave like an open file on disk
            in_memory_file = BytesIO(file.read())

            # Pass the in-memory file object to the analyzer
            result = handwriting_analyzer.analyze(in_memory_file)
            
            # REMOVED: os.remove(filepath) - No file to remove
            
            # Return the result as JSON
            return jsonify(result)
        except Exception as e:
            print(f"An error occurred during analysis: {e}")
            return jsonify({"error": f"An internal error occurred: {e}"}), 500

    return jsonify({"error": "An unknown error occurred"}), 500

# --- Start the Server ---
if __name__ == '__main__':
    # Use os.environ.get('PORT', 5000) for Render compatibility
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)