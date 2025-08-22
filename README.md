# Brain Emotion Detection

AI-powered emotion analysis from EEG neural signals using machine learning. This web application analyzes brain signals to detect emotional states by processing 45 selected EEG features and classifying emotions into three categories: Positive, Negative, and Neutral.

## Features

- **Single Prediction**: Manual input of 45 EEG feature values
- **Batch Processing**: CSV file upload for multiple predictions
- **Test Patterns**: Pre-filled test patterns for quick testing
- **Real-time Analysis**: Instant predictions with confidence scores
- **CSV Export**: Download results with detailed probability breakdowns
- **Web Interface**: User-friendly Flask-based web application

## Installation

1. Clone the repository:
```bash
git clone https://github.com/YusufTek/brain-emotion-detection.git
cd brain-emotion-detection
```

2. Navigate to the web application folder:
```bash
cd web_app
```

3. Install dependencies:
```bash
pip install flask pandas numpy scikit-learn joblib werkzeug
```

4. Run the application:
```bash
python app.py
```

5. Open your browser to:
```
http://localhost:8000
```

## Usage

### Single Prediction
1. Enter 45 neural signal feature values manually
2. Use test pattern buttons (Positive/Negative/Neutral) for quick testing
3. Click "Analyze Emotion" to get prediction
4. View results with confidence scores and probability breakdown

### Batch Processing (CSV Upload)
1. Prepare CSV file with the required 45 EEG features
2. Click "Batch Process CSV File" section
3. Upload your CSV file (max 60MB)
4. Download results CSV with predictions added

## Required EEG Features (45 total)

The model expects these specific feature columns in your CSV:

```
min_q_2_a, min_q_17_b, min_2_b, min_q_7_a, min_q_7_b, min_2_a, min_q_12_b, 
mean_2_b, mean_d_7_b, min_q_12_a, min_q_5_b, covmat_104_b, min_q_17_a, 
min_q_10_b, min_q_2_b, mean_d_12_a, mean_d_12_b, mean_d_15_b, min_q_5_a, 
mean_d_5_a, mean_2_a, covmat_97_b, covmat_20_b, mean_d_18_a, mean_0_a, 
mean_3_a, min_q_15_b, mean_d_7_a, logm_9_a, mean_d_2_a2, covmat_104_a, 
covmat_96_b, stddev_2_a, stddev_2_b, min_q_15_a, mean_d_8_b, covmat_8_a, 
covmat_1_a, mean_0_b, covmat_20_a, mean_3_b, covmat_8_b, mean_d_2_b2, 
stddev_0_a, mean_d_17_a
```

## Model Information

The model uses a trained scikit-learn pipeline to predict three emotion classes:

- **Positive**: Small negative values (around -1)
- **Negative**: Large negative values (-25k to -35k range)  
- **Neutral**: Zero range or large positive values (0 to 50k+ range)

### Output Columns
When processing CSV files, the system adds these columns:
- `prediction`: Numeric class (0=Negative, 1=Neutral, 2=Positive)
- `emotion`: Text label (NEGATIVE, NEUTRAL, POSITIVE)
- `confidence`: Prediction confidence percentage
- `prob_negative`, `prob_neutral`, `prob_positive`: Individual class probabilities
- `missing_features_count`: Number of missing required features
- `processing_error`: Error message if processing failed
- `processed_at`: Processing timestamp

## File Structure

```
brain-emotion-detection/
├── web_app/
│   ├── app.py                 # Main Flask application
│   ├── brain_signals.pkl     # Trained ML model
│   ├── templates/
│   │   └── index.html         # Main web interface
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css    # Application styles
│   │   └── js/
│   │       └── script.js     # Frontend functionality
│   └── temp/                  # Temporary files for CSV processing
└── README.md
```

## API Endpoints

- `GET /` - Main web interface
- `POST /` - Single prediction from form data
- `POST /upload_csv` - Batch CSV processing
- `GET /download/<filename>` - Download processed results
- `GET /test` - Model testing interface
- `GET /health` - System health check
- `GET /features` - List of required features

## Development

### Testing the Model
Visit `/test` endpoint to see model predictions with various test patterns.

### Health Check
Visit `/health` endpoint to verify model loading and system status.

### Feature Information
Visit `/features` endpoint to get the complete list of required EEG features.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational and research purposes.
