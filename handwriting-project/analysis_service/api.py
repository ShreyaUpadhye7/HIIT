import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from analyzer import HandwritingAnalyzer
from io import BytesIO

# Initialize the Flask application
app = Flask(__name__)

# Enable CORS
CORS(app)

# --- Configuration ---
# Define allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# --- Load the Analyzer ---
print("Initializing the handwriting analyzer...")
MODELS_PATH = 'models'
try:
    handwriting_analyzer = HandwritingAnalyzer(MODELS_PATH)
    print("Analyzer initialized successfully.")
except Exception as e:
    print(f"FATAL: Could not initialize HandwritingAnalyzer. Error: {str(e)}")
    handwriting_analyzer = None

# Helper function to check allowed file extensions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- API Route ---
@app.route('/analyze', methods=['POST'])
def analyze_image():
    # Check if analyzer is initialized
    if handwriting_analyzer is None:
        return jsonify({"error": "Analyzer is not available due to an initialization error."}), 500

    # Check if a file was sent in the request
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    
    file = request.files['file']  # This is a FileStorage object (in-memory)
    
    # Check if a file was selected
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    # Validate file extension
    if not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Only PNG, JPG, and JPEG are allowed."}), 400

    try:
        # Read the file's content into a BytesIO object
        in_memory_file = BytesIO(file.read())

        # Ensure the file pointer is at the start
        in_memory_file.seek(0)

        # Pass the in-memory file object to the analyzer
        result = handwriting_analyzer.analyze(in_memory_file)
        
        # Return the result as JSON
        return jsonify(result), 200

    except Exception as e:
        print(f"An error occurred during analysis: {str(e)}")
        return jsonify({"error": f"An internal error occurred: {str(e)}"}), 500

# --- Start the Server ---
if __name__ == '__main__':
    # Use os.environ.get('PORT', 5000) for Render compatibility
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)