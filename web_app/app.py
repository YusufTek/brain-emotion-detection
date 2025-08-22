import os
from flask import Flask, request, render_template, send_file, jsonify
import joblib
import numpy as np
import pandas as pd
import logging
from datetime import datetime
import io
import csv
from werkzeug.utils import secure_filename

# Flask app setup
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 60 * 1024 * 1024  # 60MB max file size

# Logging configuration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Global model variable
model = None

# ACTUAL FEATURE NAMES from your dataset
EXPECTED_FEATURES = [
    'min_q_2_a', 'min_q_17_b', 'min_2_b', 'min_q_7_a', 'min_q_7_b', 
    'min_2_a', 'min_q_12_b', 'mean_2_b', 'mean_d_7_b', 'min_q_12_a', 
    'min_q_5_b', 'covmat_104_b', 'min_q_17_a', 'min_q_10_b', 'min_q_2_b', 
    'mean_d_12_a', 'mean_d_12_b', 'mean_d_15_b', 'min_q_5_a', 'mean_d_5_a', 
    'mean_2_a', 'covmat_97_b', 'covmat_20_b', 'mean_d_18_a', 'mean_0_a', 
    'mean_3_a', 'min_q_15_b', 'mean_d_7_a', 'logm_9_a', 'mean_d_2_a2', 
    'covmat_104_a', 'covmat_96_b', 'stddev_2_a', 'stddev_2_b', 'min_q_15_a', 
    'mean_d_8_b', 'covmat_8_a', 'covmat_1_a', 'mean_0_b', 'covmat_20_a', 
    'mean_3_b', 'covmat_8_b', 'mean_d_2_b2', 'stddev_0_a', 'mean_d_17_a'
]

def load_model():
    """Load the brain emotion detection model"""
    global model
    
    model_path = os.path.join(os.path.dirname(__file__), 'brain_signals.pkl')
    
    try:
        if os.path.exists(model_path):
            model = joblib.load(model_path)
            logger.info("Model loaded successfully from: %s", model_path)
        else:
            # Try current directory
            model = joblib.load('brain_signals.pkl')
            logger.info("Model loaded from current directory")
        
        # Log model information
        logger.info("Model type: %s", type(model).__name__)
        logger.info("Model classes: %s", getattr(model, 'classes_', 'Not available'))
        
        if hasattr(model, 'n_features_in_'):
            logger.info("Expected features: %d", model.n_features_in_)
        
        return True
        
    except FileNotFoundError:
        logger.error("Model file 'brain_signals.pkl' not found")
        return False
    except Exception as e:
        logger.error("Error loading model: %s", str(e))
        return False

def validate_features(features):
    """Validate input features"""
    try:
        # Convert to numpy array for validation
        feature_array = np.array(features, dtype=float)
        
        # Check for invalid values
        if np.any(np.isnan(feature_array)) or np.any(np.isinf(feature_array)):
            return False, "Features contain invalid values (NaN or Inf)"
        
        # Check feature count
        if len(feature_array) != 45:
            return False, f"Expected 45 features, got {len(feature_array)}"
        
        return True, feature_array
        
    except (ValueError, TypeError) as e:
        return False, f"Invalid feature format: {str(e)}"

def map_prediction_to_emotion(prediction):
    """Map model prediction to emotion name"""
    try:
        emotion_mapping = {
            0: "NEGATIVE",
            1: "NEUTRAL", 
            2: "POSITIVE"
        }
        
        emotion = emotion_mapping.get(prediction, f"UNKNOWN_{prediction}")
        return emotion
        
    except (IndexError, KeyError) as e:
        logger.error("Error mapping prediction %s: %s", prediction, str(e))
        return f"UNKNOWN_{prediction}"

def extract_features_from_row(row_data, available_columns):
    """Extract the 45 required features from a CSV row"""
    features = []
    missing_features = []
    
    for feature_name in EXPECTED_FEATURES:
        if feature_name in available_columns:
            try:
                value = float(row_data[feature_name])
                features.append(value)
            except (ValueError, TypeError):
                features.append(0.0)
                missing_features.append(f"{feature_name} (invalid value)")
        else:
            features.append(0.0)
            missing_features.append(f"{feature_name} (not found)")
    
    return features, missing_features

def process_csv_data(csv_content):
    """Process CSV file and return predictions"""
    try:
        # Read CSV
        df = pd.read_csv(io.StringIO(csv_content))
        
        logger.info(f"CSV loaded with {len(df)} rows and {len(df.columns)} columns")
        logger.info(f"Available columns: {list(df.columns)}")
        
        # Check which of our required features are available
        available_features = [col for col in EXPECTED_FEATURES if col in df.columns]
        missing_features = [col for col in EXPECTED_FEATURES if col not in df.columns]
        
        logger.info(f"Found {len(available_features)} out of {len(EXPECTED_FEATURES)} required features")
        
        if len(available_features) == 0:
            return None, f"No required features found in CSV. Expected features: {', '.join(EXPECTED_FEATURES[:10])}..."
        
        # Process each row
        results = []
        errors = []
        
        for idx, (_, row) in enumerate(df.iterrows()):
            try:
                # Extract features
                features, row_missing = extract_features_from_row(row, df.columns)
                
                # Validate
                is_valid, validation_result = validate_features(features)
                if not is_valid:
                    error_msg = f"{validation_result}"
                    if row_missing:
                        error_msg += f" | Missing: {len(row_missing)} features"
                    
                    errors.append(f"Row {idx + 1}: {error_msg}")
                    results.append({
                        'row_index': idx + 1,
                        'prediction': 'ERROR',
                        'emotion': 'ERROR',
                        'confidence': 0.0,
                        'prob_negative': 0.0,
                        'prob_neutral': 0.0,
                        'prob_positive': 0.0,
                        'error': error_msg,
                        'missing_features_count': len(row_missing)
                    })
                    continue
                
                # Make prediction
                prediction = model.predict([features])[0]
                probabilities = model.predict_proba([features])[0]
                emotion = map_prediction_to_emotion(prediction)
                confidence = max(probabilities) * 100
                
                results.append({
                    'row_index': idx + 1,
                    'prediction': int(prediction),
                    'emotion': emotion,
                    'confidence': round(confidence, 2),
                    'prob_negative': round(probabilities[0] * 100, 2),
                    'prob_neutral': round(probabilities[1] * 100, 2),
                    'prob_positive': round(probabilities[2] * 100, 2),
                    'error': None,
                    'missing_features_count': len(row_missing)
                })
                
            except Exception as e:
                error_msg = f"Processing error: {str(e)}"
                errors.append(f"Row {idx + 1}: {error_msg}")
                results.append({
                    'row_index': idx + 1,
                    'prediction': 'ERROR',
                    'emotion': 'ERROR',
                    'confidence': 0.0,
                    'prob_negative': 0.0,
                    'prob_neutral': 0.0,
                    'prob_positive': 0.0,
                    'error': error_msg,
                    'missing_features_count': 0
                })
        
        # Create results DataFrame
        results_df = pd.DataFrame(results)
        
        # Combine original data with results
        output_df = df.copy()
        output_df['prediction'] = results_df['prediction']
        output_df['emotion'] = results_df['emotion']
        output_df['confidence'] = results_df['confidence']
        output_df['prob_negative'] = results_df['prob_negative']
        output_df['prob_neutral'] = results_df['prob_neutral']
        output_df['prob_positive'] = results_df['prob_positive']
        output_df['processing_error'] = results_df['error']
        output_df['missing_features_count'] = results_df['missing_features_count']
        output_df['processed_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Add feature availability summary
        feature_summary = {
            'total_required_features': len(EXPECTED_FEATURES),
            'available_features': len(available_features),
            'missing_features': len(missing_features),
            'feature_coverage': round((len(available_features) / len(EXPECTED_FEATURES)) * 100, 1)
        }
        
        return output_df, errors, feature_summary
        
    except Exception as e:
        return None, f"CSV processing error: {str(e)}", None

@app.route('/', methods=['GET', 'POST'])
def home():
    """Main route for emotion detection"""
    
    if request.method == 'GET':
        return render_template('index.html', expected_features=EXPECTED_FEATURES)
    
    # POST request - Process prediction
    try:
        # Check if model is loaded
        if model is None:
            logger.error("Model not available for prediction")
            return render_template('index.html', 
                                 error="Model not loaded. Please check server configuration.",
                                 expected_features=EXPECTED_FEATURES)
        
        # Extract and validate features from form (using actual feature names)
        features = []
        for feature_name in EXPECTED_FEATURES:
            value = request.form.get(feature_name, '0')
            try:
                numeric_value = float(value) if value.strip() else 0.0
                features.append(numeric_value)
            except (ValueError, TypeError):
                features.append(0.0)
        
        # Validate features
        is_valid, validation_result = validate_features(features)
        if not is_valid:
            logger.error("Feature validation failed: %s", validation_result)
            return render_template('index.html', error=validation_result, expected_features=EXPECTED_FEATURES)
        
        feature_array = validation_result
        
        # Log feature statistics
        logger.info("Feature stats - Min: %.2f, Max: %.2f, Mean: %.2f", 
                   feature_array.min(), feature_array.max(), feature_array.mean())
        
        # Make prediction using pipeline (includes scaling)
        prediction = model.predict([feature_array])[0]
        probabilities = model.predict_proba([feature_array])[0]
        
        # Convert probabilities to list for template
        prob_list = probabilities.tolist()
        confidence = round(max(prob_list) * 100, 1)
        
        # Map prediction to emotion
        emotion = map_prediction_to_emotion(prediction)
        
        # Log results
        logger.info("Raw prediction: %s", prediction)
        logger.info("Mapped emotion: %s", emotion)
        logger.info("Confidence: %.1f%%", confidence)
        logger.info("Probabilities: %s", prob_list)
        
        return render_template('index.html', 
                             result=emotion,
                             confidence=confidence,
                             probabilities=prob_list,
                             expected_features=EXPECTED_FEATURES)
        
    except Exception as e:
        error_msg = f"Prediction error: {str(e)}"
        logger.error("%s", error_msg)
        return render_template('index.html', error=error_msg, expected_features=EXPECTED_FEATURES)

@app.route('/upload_csv', methods=['POST'])
def upload_csv():
    """Handle CSV file upload and batch processing"""
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded'}), 500
        
        if 'csv_file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['csv_file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not file.filename.lower().endswith('.csv'):
            return jsonify({'error': 'Please upload a CSV file'}), 400
        
        # Read file content
        csv_content = file.read().decode('utf-8')
        
        # Process CSV
        process_result = process_csv_data(csv_content)
        
        if len(process_result) == 3:
            results_df, errors, feature_summary = process_result
        else:
            results_df, errors = process_result
            feature_summary = None
        
        if results_df is None:
            return jsonify({'error': errors}), 400
        
        # Generate output filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        original_name = secure_filename(file.filename.rsplit('.', 1)[0])
        output_filename = f"{original_name}_predictions_{timestamp}.csv"
        
        # Save to temporary location
        temp_dir = os.path.join(os.getcwd(), 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        output_path = os.path.join(temp_dir, output_filename)
        results_df.to_csv(output_path, index=False)
        
        # Calculate summary statistics
        total_rows = len(results_df)
        successful_predictions = len(results_df[results_df['emotion'] != 'ERROR'])
        error_count = len(results_df[results_df['emotion'] == 'ERROR'])
        
        # Return summary with feature information
        summary = {
            'total_rows': total_rows,
            'successful_predictions': successful_predictions,
            'errors': error_count,
            'success_rate': round((successful_predictions / total_rows) * 100, 1) if total_rows > 0 else 0,
            'error_details': errors[:10],  # First 10 errors
            'output_filename': output_filename,
            'download_url': f'/download/{output_filename}',
            'feature_summary': feature_summary
        }
        
        logger.info(f"CSV processed: {summary}")
        
        return jsonify({
            'success': True,
            'summary': summary,
            'message': f"Processed {total_rows} rows - {successful_predictions} successful, {error_count} errors"
        })
        
    except Exception as e:
        error_msg = f"CSV upload error: {str(e)}"
        logger.error(error_msg)
        return jsonify({'error': error_msg}), 500

@app.route('/download/<filename>')
def download_file(filename):
    try:
        # Secure filename
        safe_filename = secure_filename(filename)
        
        # Check temp directory
        temp_dir = os.path.join(os.getcwd(), 'temp')
        if not os.path.exists(temp_dir):
            logger.error(f"Temp directory not found: {temp_dir}")
            return "Temp directory not found", 404
        
        # File path
        file_path = os.path.join(temp_dir, safe_filename)
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return "File not found", 404
        
        logger.info(f"Downloading: {file_path}")
        
        return send_file(
            file_path,
            as_attachment=True,
            download_name=safe_filename,
            mimetype='text/csv'
        )
        
    except Exception as e:
        logger.error(f"Download error: {str(e)}")
        return f"Download error: {str(e)}", 500

@app.route('/features')
def get_features():
    """Return the list of expected features"""
    return jsonify({
        'features': EXPECTED_FEATURES,
        'total_count': len(EXPECTED_FEATURES),
        'feature_types': {
            'min_q': [f for f in EXPECTED_FEATURES if f.startswith('min_q')],
            'mean': [f for f in EXPECTED_FEATURES if f.startswith('mean')],
            'covmat': [f for f in EXPECTED_FEATURES if f.startswith('covmat')],
            'stddev': [f for f in EXPECTED_FEATURES if f.startswith('stddev')],
            'logm': [f for f in EXPECTED_FEATURES if f.startswith('logm')]
        }
    })

@app.route('/test')
def test_model():
    """Test endpoint with actual feature patterns"""
    
    if model is None:
        return "<h2>Model not loaded</h2>"
    
    # Test patterns using actual feature ranges
    test_patterns = [
        # Test with typical EEG values
        ([0.1] * 45, "Typical Positive Values"),
        ([0.01] * 45, "Small Positive Values"),
        ([0.0] * 45, "Zero Values"),
        ([-0.01] * 45, "Small Negative Values"),
        ([-0.1] * 45, "Moderate Negative Values"),
        ([-1.0] * 45, "Large Negative Values"),
        
        # Mixed patterns
        ([0.1 if i % 2 == 0 else -0.1 for i in range(45)], "Alternating Pattern"),
    ]
    
    html = ["<html><head><title>Brain Emotion Model Test</title></head><body>"]
    html.append("<h1>Brain Emotion Model Test</h1>")
    html.append("<style>body{font-family:Arial;margin:20px;} .test{margin:10px 0;padding:10px;border:1px solid #ddd;} .positive{background:#d4edda;} .negative{background:#f8d7da;} .neutral{background:#fff3cd;}</style>")
    
    # Show expected features
    html.append("<h2>Expected Features (45 total):</h2>")
    html.append("<div style='max-height:200px;overflow-y:scroll;border:1px solid #ccc;padding:10px;'>")
    for i, feature in enumerate(EXPECTED_FEATURES):
        html.append(f"<p><b>F{i+1}:</b> {feature}</p>")
    html.append("</div>")
    
    for i, (pattern, description) in enumerate(test_patterns):
        try:
            pred = model.predict([pattern])[0]
            prob = model.predict_proba([pattern])[0]
            emotion = map_prediction_to_emotion(pred)
            
            css_class = emotion.lower() if emotion in ['POSITIVE', 'NEGATIVE', 'NEUTRAL'] else ''
            
            html.append(f"<div class='test {css_class}'>")
            html.append(f"<h3>Test {i+1}: {description}</h3>")
            html.append(f"<p><b>Raw Prediction:</b> {pred}</p>")
            html.append(f"<p><b>Emotion:</b> {emotion}</p>")
            html.append(f"<p><b>Confidence:</b> {prob.max():.1%}</p>")
            html.append(f"<p><b>Probabilities:</b> NEG:{prob[0]:.3f}, NEU:{prob[1]:.3f}, POS:{prob[2]:.3f}</p>")
            html.append(f"</div>")
            
        except Exception as e:
            html.append(f"<div class='test' style='background:#ffebee;'>")
            html.append(f"<h3>Test {i+1}: {description}</h3>")
            html.append(f"<p style='color:red;'><b>Error:</b> {str(e)}</p>")
            html.append(f"</div>")
    
    # Model info
    html.append("<h2>Model Information</h2>")
    html.append(f"<p><b>Model Type:</b> {type(model).__name__}</p>")
    html.append(f"<p><b>Classes:</b> {getattr(model, 'classes_', 'Not available')}</p>")
    html.append(f"<p><b>Expected Features:</b> {len(EXPECTED_FEATURES)}</p>")
    
    html.append("</body></html>")
    return "".join(html)

@app.route('/health')
def health():
    """Health check endpoint"""
    return {
        "status": "healthy" if model is not None else "unhealthy",
        "model_loaded": model is not None,
        "model_type": type(model).__name__ if model else None,
        "expected_features": len(EXPECTED_FEATURES),
        "feature_names": EXPECTED_FEATURES[:5] + ["..."] if len(EXPECTED_FEATURES) > 5 else EXPECTED_FEATURES
    }

# Initialize model on startup
if __name__ == '__main__':
    print("Brain Emotion Detection Server with Real Features")
    print("=" * 60)
    
    # Load model
    if load_model():
        print("Model loaded successfully")
        print(f"Expected features: {len(EXPECTED_FEATURES)}")
        print(f"Sample features: {EXPECTED_FEATURES[:5]}...")
    else:
        print("Model loading failed")
    
    print("Server: http://localhost:8000")
    print("Test: http://localhost:8000/test")
    print("Health: http://localhost:8000/health")
    print("Features: http://localhost:8000/features")
    print("=" * 60)
    
    app.run(debug=True, port=8000, host='0.0.0.0')
else:
    # Load model when imported
    load_model()