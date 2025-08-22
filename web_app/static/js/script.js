// Brain Emotion Detection - Updated with Real EEG Features

'use strict';

// ACTUAL FEATURE NAMES from your EEG dataset
const EXPECTED_FEATURES = [
    'min_q_2_a', 'min_q_17_b', 'min_2_b', 'min_q_7_a', 'min_q_7_b', 
    'min_2_a', 'min_q_12_b', 'mean_2_b', 'mean_d_7_b', 'min_q_12_a', 
    'min_q_5_b', 'covmat_104_b', 'min_q_17_a', 'min_q_10_b', 'min_q_2_b', 
    'mean_d_12_a', 'mean_d_12_b', 'mean_d_15_b', 'min_q_5_a', 'mean_d_5_a', 
    'mean_2_a', 'covmat_97_b', 'covmat_20_b', 'mean_d_18_a', 'mean_0_a', 
    'mean_3_a', 'min_q_15_b', 'mean_d_7_a', 'logm_9_a', 'mean_d_2_a2', 
    'covmat_104_a', 'covmat_96_b', 'stddev_2_a', 'stddev_2_b', 'min_q_15_a', 
    'mean_d_8_b', 'covmat_8_a', 'covmat_1_a', 'mean_0_b', 'covmat_20_a', 
    'mean_3_b', 'covmat_8_b', 'mean_d_2_b2', 'stddev_0_a', 'mean_d_17_a'
];

// EEG Pattern configurations based on your test results
const EEG_PATTERNS = {
    POSITIVE: {
        // Test shows -1 works for POSITIVE
        'mean_': () => -1 + (Math.random() - 0.5) * 0.2,        // Around -1
        'mean_d_': () => -1 + (Math.random() - 0.5) * 0.2,      // Around -1
        'min_q_': () => -1 + (Math.random() - 0.5) * 0.2,       // Around -1
        'min_': () => -1 + (Math.random() - 0.5) * 0.2,         // Around -1
        'covmat_': () => -1 + (Math.random() - 0.5) * 0.2,      // Around -1
        'stddev_': () => -1 + (Math.random() - 0.5) * 0.2,      // Around -1
        'logm_': () => -1 + (Math.random() - 0.5) * 0.2         // Around -1
    },
    
    NEGATIVE: {
        // Test shows large negative values work for NEGATIVE
        'mean_': () => -30000 + Math.random() * -20000,         // -30k to -50k
        'mean_d_': () => -30000 + Math.random() * -20000,       // -30k to -50k
        'min_q_': () => -30000 + Math.random() * -20000,        // -30k to -50k
        'min_': () => -30000 + Math.random() * -20000,          // -30k to -50k
        'covmat_': () => -30000 + Math.random() * -20000,       // -30k to -50k
        'stddev_': () => -30000 + Math.random() * -20000,       // -30k to -50k
        'logm_': () => -30000 + Math.random() * -20000          // -30k to -50k
    },
    
    NEUTRAL: {
        // Test shows zero and large positive values work for NEUTRAL
        'mean_': () => Math.random() < 0.5 ? 0 : 20000 + Math.random() * 30000,    // 0 or 20k-50k
        'mean_d_': () => Math.random() < 0.5 ? 0 : 20000 + Math.random() * 30000,  // 0 or 20k-50k
        'min_q_': () => Math.random() < 0.5 ? 0 : 20000 + Math.random() * 30000,   // 0 or 20k-50k
        'min_': () => Math.random() < 0.5 ? 0 : 20000 + Math.random() * 30000,     // 0 or 20k-50k
        'covmat_': () => Math.random() < 0.5 ? 0 : 20000 + Math.random() * 30000,  // 0 or 20k-50k
        'stddev_': () => Math.random() < 0.5 ? 0 : 20000 + Math.random() * 30000,  // 0 or 20k-50k
        'logm_': () => Math.random() < 0.5 ? 0 : 20000 + Math.random() * 30000     // 0 or 20k-50k
    }
};

// Application state
class AppState {
    constructor() {
        this.isAnalyzing = false;
        this.currentPattern = null;
        this.lastResults = null;
        this.csvFile = null;
        this.isUploading = false;
    }

    setAnalyzing(state) { this.isAnalyzing = state; }
    setPattern(pattern) { this.currentPattern = pattern; }
    setResults(results) { this.lastResults = results; }
    setCsvFile(file) { this.csvFile = file; }
    setUploading(state) { this.isUploading = state; }
}

const appState = new AppState();

// Notification system
class NotificationManager {
    static show(message, type = 'info', duration = 3000) {
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    static success(message) { this.show(message, 'success'); }
    static error(message) { this.show(message, 'error'); }
    static warning(message) { this.show(message, 'warning'); }
    static info(message) { this.show(message, 'info'); }
}

// EEG Feature Pattern Generator
class EEGPatternGenerator {
    static generateFeatureValue(featureName, patternType) {
        const patterns = EEG_PATTERNS[patternType];
        
        // Find matching pattern prefix
        for (const [prefix, generator] of Object.entries(patterns)) {
            if (featureName.startsWith(prefix)) {
                return generator();
            }
        }
        
        // Default fallback
        return patterns['mean_']();
    }
    
    static fillPattern(patternType, patternName) {
        const inputs = EXPECTED_FEATURES.map(featureName => 
            document.querySelector(`input[name="${featureName}"]`)
        ).filter(input => input !== null);
        
        if (inputs.length === 0) {
            NotificationManager.error('No feature inputs found');
            return 0;
        }
        
        let fillCount = 0;
        
        inputs.forEach((input, index) => {
            const featureName = EXPECTED_FEATURES[index];
            const value = this.generateFeatureValue(featureName, patternType);
            input.value = Number(value).toFixed(4);
            fillCount++;
            this.addInputFeedback(input, patternName);
        });
        
        appState.setPattern(patternName);
        
        // Log statistics
        const values = inputs.map(input => parseFloat(input.value));
        const stats = {
            min: Math.min(...values),
            max: Math.max(...values),
            mean: values.reduce((a, b) => a + b, 0) / values.length
        };
        
        console.log(`${patternName} pattern generated:`, stats);
        NotificationManager.success(`Generated ${fillCount} ${patternName} values`);
        
        return fillCount;
    }

    static addInputFeedback(input, patternName) {
        input.classList.remove('valid', 'invalid', 'positive-feedback', 'negative-feedback', 'neutral-feedback');
        
        const feedbackClass = `${patternName.toLowerCase()}-feedback`;
        input.classList.add('valid', feedbackClass);
        
        setTimeout(() => {
            input.classList.remove(feedbackClass);
        }, 1500);
    }

    static positive() {
        return this.fillPattern('POSITIVE', 'positive');
    }

    static negative() {
        return this.fillPattern('NEGATIVE', 'negative');
    }

    static neutral() {
        return this.fillPattern('NEUTRAL', 'neutral');
    }
}

// CSV Upload Manager
class CsvUploadManager {
    static init() {
        this.initDropzone();
        console.log('CSV Upload Manager initialized with real EEG features');
    }

    static initDropzone() {
        const dropzone = document.getElementById('csvUploadArea');
        if (!dropzone) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
        });

        dropzone.addEventListener('drop', this.handleDrop.bind(this), false);
    }

    static preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    static handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            this.handleFileSelect({ target: { files: files } });
        }
    }

    static validateFile(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            return { valid: false, error: 'Please select a CSV file' };
        }

        if (file.size > 60 * 1024 * 1024) { // 60MB
            return { valid: false, error: 'File size must be less than 60MB' };
        }

        return { valid: true };
    }

    static displayFileInfo(file) {
        const statusDiv = document.getElementById('uploadStatus');
        const actionsDiv = document.getElementById('uploadActions');

        statusDiv.innerHTML = `
            <div class="file-info">
                <div class="file-icon">📄</div>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                    <div class="file-status success">Ready to process</div>
                    <div class="file-requirements">Will extract ${EXPECTED_FEATURES.length} EEG features</div>
                </div>
            </div>
        `;

        statusDiv.style.display = 'block';
        actionsDiv.style.display = 'block';
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static async uploadFile() {
        if (appState.isUploading) {
            NotificationManager.warning('Upload already in progress...');
            return;
        }

        if (!appState.csvFile) {
            NotificationManager.error('No file selected');
            return;
        }

        appState.setUploading(true);
        this.showUploadProgress();

        try {
            const formData = new FormData();
            formData.append('csv_file', appState.csvFile);

            const response = await fetch('/upload_csv', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.showUploadSuccess(result);
                NotificationManager.success('CSV processed successfully!');
            } else {
                this.showUploadError(result.error || 'Upload failed');
                NotificationManager.error(result.error || 'Upload failed');
            }

        } catch (error) {
            this.showUploadError(`Network error: ${error.message}`);
            NotificationManager.error('Network error occurred');
        } finally {
            appState.setUploading(false);
            this.hideUploadProgress();
        }
    }

    static showUploadProgress() {
        const uploadBtn = document.querySelector('.btn-upload');
        const btnText = uploadBtn.querySelector('.btn-text');
        const btnLoading = uploadBtn.querySelector('.btn-loading');
        
        if (btnText && btnLoading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
        }
        
        uploadBtn.disabled = true;
        uploadBtn.classList.add('loading');
    }

    static hideUploadProgress() {
        const uploadBtn = document.querySelector('.btn-upload');
        const btnText = uploadBtn.querySelector('.btn-text');
        const btnLoading = uploadBtn.querySelector('.btn-loading');
        
        if (btnText && btnLoading) {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
        
        uploadBtn.disabled = false;
        uploadBtn.classList.remove('loading');
    }

    static showUploadSuccess(result) {
        const resultsDiv = document.getElementById('uploadResults');
        const summary = result.summary;

        let featureSummaryHtml = '';
        if (summary.feature_summary) {
            const fs = summary.feature_summary;
            featureSummaryHtml = `
                <div class="feature-summary">
                    <h5>Feature Analysis:</h5>
                    <div class="feature-stats">
                        <span class="feature-stat">Coverage: ${fs.feature_coverage}%</span>
                        <span class="feature-stat">Found: ${fs.available_features}/${fs.total_required_features}</span>
                        <span class="feature-stat">Missing: ${fs.missing_features}</span>
                    </div>
                </div>
            `;
        }

        resultsDiv.innerHTML = `
            <div class="upload-success">
                <div class="success-header">
                    <div class="success-icon">✅</div>
                    <h4>Processing Complete!</h4>
                </div>
                
                ${featureSummaryHtml}
                
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Rows:</span>
                        <span class="stat-value">${summary.total_rows}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Successful:</span>
                        <span class="stat-value success">${summary.successful_predictions}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Success Rate:</span>
                        <span class="stat-value success">${summary.success_rate}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Errors:</span>
                        <span class="stat-value ${summary.errors > 0 ? 'error' : 'success'}">${summary.errors}</span>
                    </div>
                </div>

                ${summary.error_details && summary.error_details.length > 0 ? `
                    <div class="error-details">
                        <h5>Error Details:</h5>
                        <ul>
                            ${summary.error_details.map(error => `<li>${error}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <div class="download-section">
                    <a href="${summary.download_url}" class="btn btn-download" download>
                        📥 Download Results (${summary.output_filename})
                    </a>
                </div>
            </div>
        `;

        resultsDiv.style.display = 'block';
    }

    static showUploadError(error) {
        const resultsDiv = document.getElementById('uploadResults');
        
        resultsDiv.innerHTML = `
            <div class="upload-error">
                <div class="error-header">
                    <div class="error-icon">❌</div>
                    <h4>Upload Failed</h4>
                </div>
                <div class="error-message">${error}</div>
                <div class="error-suggestion">
                    Please ensure your CSV contains the required EEG features and try again.
                </div>
            </div>
        `;

        resultsDiv.style.display = 'block';
    }
}

// Form handling
class FormHandler {
    static init() {
        const form = document.getElementById('emotionForm');
        if (!form) {
            console.error('Emotion form not found');
            return;
        }

        form.addEventListener('submit', this.handleSubmit.bind(this));
        this.initInputValidation();
        this.addFeatureTooltips();
        console.log('Form handler initialized with real EEG features');
    }

    static addFeatureTooltips() {
        EXPECTED_FEATURES.forEach((featureName, index) => {
            const input = document.querySelector(`input[name="${featureName}"]`);
            if (input) {
                const description = this.getFeatureDescription(featureName);
                input.title = `${featureName}: ${description}`;
                input.setAttribute('data-tooltip', description);
                input.setAttribute('data-feature-name', featureName);
            }
        });
        
        console.log(`Feature tooltips added for ${EXPECTED_FEATURES.length} EEG features`);
    }

    static getFeatureDescription(featureName) {
        if (featureName.startsWith('min_q_')) return 'Minimum quantile from EEG channel analysis';
        if (featureName.startsWith('min_')) return 'Minimum amplitude value from EEG electrode';
        if (featureName.startsWith('mean_d_')) return 'Mean differential between electrode pairs';
        if (featureName.startsWith('mean_')) return 'Mean amplitude from EEG electrode';
        if (featureName.startsWith('covmat_')) return 'Covariance matrix element (connectivity)';
        if (featureName.startsWith('stddev_')) return 'Standard deviation (signal variability)';
        if (featureName.startsWith('logm_')) return 'Logarithmic matrix transformation';
        return 'EEG signal analysis feature';
    }

    static initInputValidation() {
        EXPECTED_FEATURES.forEach(featureName => {
            const input = document.querySelector(`input[name="${featureName}"]`);
            if (input) {
                input.addEventListener('input', (e) => this.validateInput(e.target));
                input.addEventListener('blur', (e) => this.validateInput(e.target));
                
                input.addEventListener('focus', (e) => {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.zIndex = '10';
                });
                
                input.addEventListener('blur', (e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.zIndex = '1';
                });
            }
        });
        
        console.log(`Input validation initialized for ${EXPECTED_FEATURES.length} features`);
    }

    static validateInput(input) {
        const value = input.value.trim();
        
        input.classList.remove('valid', 'invalid');
        
        if (value === '') {
            return true;
        }
        
        const numValue = parseFloat(value);
        if (isNaN(numValue) || !isFinite(numValue)) {
            input.classList.add('invalid');
            return false;
        } else {
            input.classList.add('valid');
            return true;
        }
    }

    static validateForm() {
        const validInputs = EXPECTED_FEATURES.filter(featureName => {
            const input = document.querySelector(`input[name="${featureName}"]`);
            return input && this.validateInput(input) && input.value.trim() !== '';
        });
        
        if (validInputs.length === 0) {
            NotificationManager.warning('Please enter some EEG feature values or use test patterns');
            return false;
        }
        
        return true;
    }

    static handleSubmit(event) {
        if (appState.isAnalyzing) {
            event.preventDefault();
            NotificationManager.warning('Analysis already in progress...');
            return false;
        }
        
        if (!this.validateForm()) {
            event.preventDefault();
            return false;
        }
        
        appState.setAnalyzing(true);
        this.showLoadingState();
        this.logSubmissionStats();
        
        NotificationManager.info('Analyzing EEG patterns...', 2000);
        
        setTimeout(() => {
            const resultSection = document.querySelector('.result-section');
            if (resultSection) {
                resultSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center'
                });
            }
        }, 100);
        
        return true;
    }

    static logSubmissionStats() {
        const values = EXPECTED_FEATURES.map(featureName => {
            const input = document.querySelector(`input[name="${featureName}"]`);
            return input ? (parseFloat(input.value) || 0) : 0;
        });
        
        const stats = {
            totalFeatures: values.length,
            nonZeroCount: values.filter(v => v !== 0).length,
            positiveCount: values.filter(v => v > 0).length,
            negativeCount: values.filter(v => v < 0).length,
            range: {
                min: Math.min(...values),
                max: Math.max(...values),
                mean: values.reduce((a, b) => a + b, 0) / values.length
            },
            pattern: appState.currentPattern || 'manual'
        };
        
        console.log('Submitting EEG analysis:', stats);
        appState.setResults(stats);
    }

    static showLoadingState() {
        const predictBtn = document.getElementById('predictBtn');
        const btnText = predictBtn.querySelector('.btn-text');
        const btnLoading = predictBtn.querySelector('.btn-loading');
        
        if (btnText && btnLoading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
        }
        
        predictBtn.disabled = true;
        predictBtn.classList.add('loading');
    }

    static resetLoadingState() {
        const predictBtn = document.getElementById('predictBtn');
        const btnText = predictBtn.querySelector('.btn-text');
        const btnLoading = predictBtn.querySelector('.btn-loading');
        
        if (btnText && btnLoading) {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
        
        predictBtn.disabled = false;
        predictBtn.classList.remove('loading');
        appState.setAnalyzing(false);
    }
}

// Keyboard shortcuts
class KeyboardManager {
    static init() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        console.log('Keyboard shortcuts enabled');
        
        setTimeout(() => {
            console.log('Available shortcuts:');
            console.log('  Ctrl+1: Fill positive pattern');
            console.log('  Ctrl+2: Fill negative pattern');
            console.log('  Ctrl+3: Fill neutral pattern');
            console.log('  Ctrl+0: Clear all values');
            console.log('  Ctrl+Enter: Start analysis');
        }, 1000);
    }

    static handleKeyDown(event) {
        if (event.target.tagName === 'INPUT' && event.target.type === 'number') {
            return;
        }
        
        if (event.ctrlKey || event.metaKey) {
            switch(event.key) {
                case '1':
                    event.preventDefault();
                    fillPositive();
                    break;
                case '2':
                    event.preventDefault();
                    fillNegative();
                    break;
                case '3':
                    event.preventDefault();
                    fillNeutral();
                    break;
                case 'Enter':
                    event.preventDefault();
                    document.getElementById('predictBtn')?.click();
                    break;
                case '0':
                    event.preventDefault();
                    clearAllInputs();
                    break;
            }
        }
    }
}

// Animation manager
class AnimationManager {
    static init() {
        this.addStarfield();
        this.animateExistingResults();
        console.log('Animation manager initialized');
    }

    static addStarfield() {
        const starfield = document.createElement('div');
        starfield.className = 'starfield';
        document.body.appendChild(starfield);
    }

    static animateExistingResults() {
        const resultCard = document.querySelector('.result-card');
        if (resultCard) {
            this.animateResultCard(resultCard);
        }
    }

    static animateResultCard(card) {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100);
    }

    static addButtonFeedback(button) {
        if (button) {
            button.classList.add('btn-pressed');
            setTimeout(() => button.classList.remove('btn-pressed'), 200);
        }
    }
}

// Debug utilities
class DebugUtils {
    static logCurrentValues() {
        const values = EXPECTED_FEATURES.map(featureName => {
            const input = document.querySelector(`input[name="${featureName}"]`);
            return input ? (parseFloat(input.value) || 0) : 0;
        });
        
        const stats = {
            total: values.length,
            nonZero: values.filter(v => v !== 0).length,
            positive: values.filter(v => v > 0).length,
            negative: values.filter(v => v < 0).length,
            zero: values.filter(v => v === 0).length,
            range: {
                min: Math.min(...values),
                max: Math.max(...values),
                mean: values.reduce((a, b) => a + b, 0) / values.length
            },
            sampleFeatures: EXPECTED_FEATURES.slice(0, 10),
            sampleValues: values.slice(0, 10)
        };
        
        console.log('Current EEG feature analysis:', stats);
        return stats;
    }

    static analyzeFeatureTypes() {
        console.log('EEG FEATURE BREAKDOWN:');
        console.log('Total features:', EXPECTED_FEATURES.length);
        
        const featureTypes = {
            'min_q_': EXPECTED_FEATURES.filter(f => f.startsWith('min_q_')),
            'min_': EXPECTED_FEATURES.filter(f => f.startsWith('min_') && !f.startsWith('min_q_')),
            'mean_d_': EXPECTED_FEATURES.filter(f => f.startsWith('mean_d_')),
            'mean_': EXPECTED_FEATURES.filter(f => f.startsWith('mean_') && !f.startsWith('mean_d_')),
            'covmat_': EXPECTED_FEATURES.filter(f => f.startsWith('covmat_')),
            'stddev_': EXPECTED_FEATURES.filter(f => f.startsWith('stddev_')),
            'logm_': EXPECTED_FEATURES.filter(f => f.startsWith('logm_'))
        };
        
        Object.entries(featureTypes).forEach(([type, features]) => {
            console.log(`${type}: ${features.length} features`);
            console.log(`  Examples: ${features.slice(0, 3).join(', ')}`);
        });
        
        return featureTypes;
    }
}

// Global functions for HTML buttons
function fillPositive() {
    EEGPatternGenerator.positive();
    AnimationManager.addButtonFeedback(event?.target);
}

function fillNegative() {
    EEGPatternGenerator.negative();
    AnimationManager.addButtonFeedback(event?.target);
}

function fillNeutral() {
    EEGPatternGenerator.neutral();
    AnimationManager.addButtonFeedback(event?.target);
}

function clearAllInputs() {
    EXPECTED_FEATURES.forEach(featureName => {
        const input = document.querySelector(`input[name="${featureName}"]`);
        if (input) {
            input.value = '0';
            input.classList.remove('valid', 'invalid');
        }
    });
    appState.setPattern('cleared');
    NotificationManager.info('All EEG features cleared');
    console.log('All EEG feature inputs cleared');
}

// CSV Upload functions
function toggleCsvUpload() {
    const content = document.getElementById('csvUploadContent');
    const arrow = document.querySelector('.upload-arrow');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.textContent = '▲';
        content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        content.style.display = 'none';
        arrow.textContent = '▼';
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const validation = CsvUploadManager.validateFile(file);
    if (!validation.valid) {
        NotificationManager.error(validation.error);
        return;
    }

    appState.setCsvFile(file);
    CsvUploadManager.displayFileInfo(file);
    NotificationManager.success(`File "${file.name}" ready for EEG processing`);
}

function uploadCsvFile() {
    CsvUploadManager.uploadFile();
}

// Feature info toggle
function toggleFeatureInfo() {
    const content = document.getElementById('featureInfo');
    const arrow = document.querySelector('.toggle-arrow');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.textContent = '▲';
        content.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        content.style.display = 'none';
        arrow.textContent = '▼';
    }
}

// Debug functions
window.debugValues = () => DebugUtils.logCurrentValues();
window.analyzeFeatures = () => DebugUtils.analyzeFeatureTypes();
window.appState = appState;
window.EXPECTED_FEATURES = EXPECTED_FEATURES;

// App initialization
class BrainEmotionApp {
    static init() {
        console.log('Brain Emotion Detection App Starting...');
        console.log('Using real EEG features from dataset');
        
        try {
            FormHandler.init();
            KeyboardManager.init();
            AnimationManager.init();
            CsvUploadManager.init();
            
            console.log('App initialized successfully');
            console.log(`EEG Features loaded: ${EXPECTED_FEATURES.length}`);
            console.log('Feature types:', Object.keys(DebugUtils.analyzeFeatureTypes()));
            
            setTimeout(() => {
                NotificationManager.info('EEG Emotion Detection ready with real feature names!', 5000);
            }, 500);
            
        } catch (error) {
            console.error('App initialization failed:', error);
            NotificationManager.error('App initialization failed. Please refresh the page.');
        }
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', BrainEmotionApp.init);

// Reset loading state when page fully loads
window.addEventListener('load', () => {
    console.log('Page fully loaded with real EEG features');
    FormHandler.resetLoadingState();
    
    setTimeout(() => {
        console.log('CSV Upload Features:');
        console.log('• Upload CSV files with EEG feature columns');
        console.log('• System will extract the required 45 features');
        console.log('• Missing features will be set to 0.0');
        console.log('• Download results with emotion predictions');
    }, 2000);
});