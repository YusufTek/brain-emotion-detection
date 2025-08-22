# Brain Emotion Detection

AI-powered emotion analysis from neural signals using machine learning. This web application analyzes brain signals to detect emotional states by processing 45 EEG features and classifying emotions into three categories: Positive, Negative, and Neutral.

## Features

Single prediction from manual input, pre-filled test patterns for quick testing, real-time analysis with confidence scores, and web-based interface using Flask.

## Installation

Clone the repository with `git clone https://github.com/YusufTek/brain-emotion-detection.git` then navigate to the directory with `cd brain-emotion-detection`. Install dependencies by going to web_app folder with `cd web_app` and running `pip install flask pandas numpy scikit-learn joblib`. Run the application with `python app.py` and open your browser to `http://localhost:8000`.

## Usage

Enter 45 neural signal feature values, use test pattern buttons for quick testing, click "Analyze Emotion" to get prediction, and view results with confidence scores.

## Model Information

The model predicts three emotion classes based on EEG signal patterns: Positive for small negative values, Negative for large negative values, and Neutral for zero range or large positive values.

## Files

Main Flask application is in `web_app/app.py`, trained ML model is `web_app/brain_signals.pkl`, HTML templates are in `web_app/templates/`, and CSS and JavaScript files are in `web_app/static/`.
