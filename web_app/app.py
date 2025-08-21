import os
from flask import Flask, request, render_template
import joblib
import numpy as np
import logging

# Flask app setup
app = Flask(__name__)

# Logging configuration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Global model variable
model = None

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
    """Map model prediction to emotion name using CORRECT mapping"""
    try:
        # DOĞRU MAPPING: Test sonuçlarından çıkardık
        emotion_mapping = {
            0: "NEGATIVE",  # Raw 0 = NEGATIVE
            1: "NEUTRAL",   # Raw 1 = NEUTRAL  
            2: "POSITIVE"   # Raw 2 = POSITIVE
        }
        
        emotion = emotion_mapping.get(prediction, f"UNKNOWN_{prediction}")
        return emotion
        
    except (IndexError, KeyError) as e:
        logger.error("Error mapping prediction %s: %s", prediction, str(e))
        return f"UNKNOWN_{prediction}"

@app.route('/', methods=['GET', 'POST'])
def home():
    """Main route for emotion detection"""
    
    if request.method == 'GET':
        return render_template('index.html')
    
    # POST request - Process prediction
    try:
        # Check if model is loaded
        if model is None:
            logger.error("Model not available for prediction")
            return render_template('index.html', 
                                 error="Model not loaded. Please check server configuration.")
        
        # Extract and validate features from form
        features = []
        for i in range(45):
            value = request.form.get(f'f{i}', '0')
            try:
                numeric_value = float(value) if value.strip() else 0.0
                features.append(numeric_value)
            except (ValueError, TypeError):
                features.append(0.0)
        
        # Validate features
        is_valid, validation_result = validate_features(features)
        if not is_valid:
            logger.error("Feature validation failed: %s", validation_result)
            return render_template('index.html', error=validation_result)
        
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
        
        # Map prediction to emotion using CORRECT mapping
        emotion = map_prediction_to_emotion(prediction)
        
        # Log results
        logger.info("Raw prediction: %s", prediction)
        logger.info("Mapped emotion: %s", emotion)
        logger.info("Confidence: %.1f%%", confidence)
        logger.info("Probabilities: %s", prob_list)
        
        return render_template('index.html', 
                             result=emotion,
                             confidence=confidence,
                             probabilities=prob_list)
        
    except Exception as e:
        error_msg = f"Prediction error: {str(e)}"
        logger.error("%s", error_msg)
        return render_template('index.html', error=error_msg)

@app.route('/test')
def test_model():
    """Test endpoint with EXTREME value ranges to trigger all classes"""
    
    if model is None:
        return "<h2>Model not loaded</h2>"
    
    # EXTREME test patterns to trigger different predictions
    test_patterns = [
        # Try very extreme positive values
        ([10000.0] * 45, "Extreme Positive (10k)"),
        ([5000.0] * 45, "High Positive (5k)"),
        ([1000.0] * 45, "Medium Positive (1k)"),
        ([100.0] * 45, "Low Positive (100)"),
        
        # Try neutral/zero values
        ([0.0] * 45, "Zero Values"),
        ([1.0] * 45, "Tiny Positive (1)"),
        ([-1.0] * 45, "Tiny Negative (-1)"),
        
        # Try extreme negative values
        ([-100.0] * 45, "Low Negative (-100)"),
        ([-1000.0] * 45, "Medium Negative (-1k)"),
        ([-5000.0] * 45, "High Negative (-5k)"),
        ([-10000.0] * 45, "Extreme Negative (-10k)"),
        
        # Try mixed patterns
        ([10000.0, -10000.0] * 22 + [0.0], "Mixed Extreme"),
    ]
    
    html = ["<html><head><title>Model Test</title></head><body>"]
    html.append("<h1>Brain Emotion Model Test</h1>")
    html.append("<style>body{font-family:Arial;margin:20px;} .test{margin:10px 0;padding:10px;border:1px solid #ddd;} .positive{background:#d4edda;} .negative{background:#f8d7da;} .neutral{background:#fff3cd;}</style>")
    
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
            html.append(f"<p><b>Probabilities:</b> {prob.tolist()}</p>")
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
    html.append(f"<p><b>Pipeline Steps:</b> {getattr(model, 'steps', 'Not a pipeline')}</p>")
    
    html.append("</body></html>")
    return "".join(html)

@app.route('/health')
def health():
    """Health check endpoint"""
    return {
        "status": "healthy" if model is not None else "unhealthy",
        "model_loaded": model is not None,
        "model_type": type(model).__name__ if model else None
    }

# Initialize model on startup
if __name__ == '__main__':
    print("Brain Emotion Detection Server")
    print("=" * 50)
    
    # Load model
    if load_model():
        print("Model loaded successfully")
    else:
        print("Model loading failed")
    
    print("Server: http://localhost:8000")
    print("Test: http://localhost:8000/test")
    print("Health: http://localhost:8000/health")
    print("=" * 50)
    
    app.run(debug=True, port=8000, host='0.0.0.0')
else:
    # Load model when imported
    load_model()