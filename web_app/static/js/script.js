// Brain Emotion Detection - COMPLETELY FIXED JavaScript

'use strict';

// FIXED: Doğru model davranışına göre config
const CONFIG = {
    TOTAL_FEATURES: 45,
    
    // Test sonuçlarından çıkarılan DOĞRU değerler:
    
    // POSITIVE için: Küçük negatif değerler (-1 civarı)
    POSITIVE_MIN: -3,        
    POSITIVE_MAX: -0.5,      
    
    // NEGATIVE için: Büyük negatif değerler (-20000+)  
    NEGATIVE_MIN: -80000,   
    NEGATIVE_MAX: -15000,    
    
    // NEUTRAL için: Sıfır civarı (-100 to +1000)
    NEUTRAL_ZERO_MIN: -100,       
    NEUTRAL_ZERO_MAX: 100,
    
    // NEUTRAL için: Büyük pozitif değerler (10000+)
    NEUTRAL_HIGH_MIN: 10000,      
    NEUTRAL_HIGH_MAX: 80000,      
    
    // Random için çok geniş aralık - TÜM sınıfları kapsasın
    RANDOM_MIN: -100000,
    RANDOM_MAX: 100000
};

// Application state
class AppState {
    constructor() {
        this.isAnalyzing = false;
        this.currentPattern = null;
        this.lastResults = null;
    }

    setAnalyzing(state) {
        this.isAnalyzing = state;
    }

    setPattern(pattern) {
        this.currentPattern = pattern;
        console.log(`Pattern set: ${pattern}`);
    }

    setResults(results) {
        this.lastResults = results;
    }
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

// FIXED: Feature filling with correct ranges
class FeatureFiller {
    static fillInputs(valueGenerator, patternName) {
        const inputs = document.querySelectorAll('.feature-input');
        let fillCount = 0;
        
        inputs.forEach((input, index) => {
            const value = valueGenerator(index);
            input.value = Number(value).toFixed(2);
            fillCount++;
            this.addInputFeedback(input, patternName);
        });
        
        appState.setPattern(patternName);
        
        // Log değer aralığı
        const values = Array.from(inputs).map(input => parseFloat(input.value));
        const stats = {
            min: Math.min(...values),
            max: Math.max(...values),
            mean: values.reduce((a, b) => a + b, 0) / values.length
        };
        
        console.log(`${patternName} generated:`, stats);
        NotificationManager.success(`Generated ${fillCount} ${patternName} values (${stats.min.toFixed(1)} to ${stats.max.toFixed(1)})`);
        
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

    // POSITIVE: Küçük negatif değerler (-3 to -0.5)
    static positive() {
        return this.fillInputs(
            (index) => {
                const baseValue = Math.random() * (CONFIG.POSITIVE_MAX - CONFIG.POSITIVE_MIN) + CONFIG.POSITIVE_MIN;
                const variation = (Math.random() - 0.5) * 0.2; // Küçük varyasyon
                return baseValue + variation;
            },
            'positive'
        );
    }

    // NEGATIVE: Büyük negatif değerler (-80k to -15k)
    static negative() {
        return this.fillInputs(
            (index) => {
                const baseValue = Math.random() * (CONFIG.NEGATIVE_MAX - CONFIG.NEGATIVE_MIN) + CONFIG.NEGATIVE_MIN;
                const variation = (Math.random() - 0.5) * 5000; // Geniş varyasyon
                return baseValue + variation;
            },
            'negative'
        );
    }

    // NEUTRAL: Hem sıfır civarı hem büyük pozitif değerler
    static neutral() {
        return this.fillInputs(
            (index) => {
                // %50 şans sıfır civarı, %50 şans büyük pozitif
                if (Math.random() < 0.5) {
                    // Sıfır civarı değerler (-100 to +100)
                    return Math.random() * (CONFIG.NEUTRAL_ZERO_MAX - CONFIG.NEUTRAL_ZERO_MIN) + CONFIG.NEUTRAL_ZERO_MIN;
                } else {
                    // Büyük pozitif değerler (10k to 80k)
                    return Math.random() * (CONFIG.NEUTRAL_HIGH_MAX - CONFIG.NEUTRAL_HIGH_MIN) + CONFIG.NEUTRAL_HIGH_MIN;
                }
            },
            'neutral'
        );
    }

    // RANDOM: Gerçekten rastgele - TÜM sınıfları test etsin
    static random() {
        return this.fillInputs(
            (index) => {
                // DAHA AGRESIF dağılım - negative'i zorla dahil et
                const rand = Math.random();
                
                // %40 NEGATIVE range (daha yüksek oran)
                if (rand < 0.4) {
                    return Math.random() * (CONFIG.NEGATIVE_MAX - CONFIG.NEGATIVE_MIN) + CONFIG.NEGATIVE_MIN;
                }
                // %30 POSITIVE range
                else if (rand < 0.7) {
                    return Math.random() * (CONFIG.POSITIVE_MAX - CONFIG.POSITIVE_MIN) + CONFIG.POSITIVE_MIN;
                }
                // %20 NEUTRAL zero range
                else if (rand < 0.9) {
                    return Math.random() * (CONFIG.NEUTRAL_ZERO_MAX - CONFIG.NEUTRAL_ZERO_MIN) + CONFIG.NEUTRAL_ZERO_MIN;
                }
                // %10 NEUTRAL high range
                else {
                    return Math.random() * (CONFIG.NEUTRAL_HIGH_MAX - CONFIG.NEUTRAL_HIGH_MIN) + CONFIG.NEUTRAL_HIGH_MIN;
                }
            },
            'random'
        );
    }

    // Guaranteed extreme values
    static extremePositive() {
        return this.fillInputs(() => -1, 'extreme-positive');
    }

    static extremeNegative() {
        return this.fillInputs(() => -50000, 'extreme-negative');
    }

    static extremeNeutralZero() {
        return this.fillInputs(() => 0, 'extreme-neutral-zero');
    }

    // Smart Random: Randomly picks extreme values for guaranteed variety
    static smartRandom() {
        return this.fillInputs(
            (index) => {
                const patterns = [
                    () => -1,           // Guaranteed POSITIVE
                    () => -50000,       // Guaranteed NEGATIVE  
                    () => 0,            // Guaranteed NEUTRAL (zero)
                    () => 25000,        // Guaranteed NEUTRAL (high)
                ];
                
                // Rastgele bir pattern seç
                const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
                return randomPattern();
            },
            'smart-random'
        );
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
        this.addFeatureTooltips(); // Yeni: Tooltip'ları ekle
        console.log('Form handler initialized');
    }

    // Feature tooltips ekle
    static addFeatureTooltips() {
        const inputs = document.querySelectorAll('.feature-input');
        
        const featureDescriptions = {
            0: "F1: EEG F3 - Left frontal electrode (emotional valence)",
            1: "F2: EEG F4 - Right frontal electrode (emotional valence)", 
            2: "F3: EEG C3 - Left central electrode (motor activity)",
            3: "F4: EEG C4 - Right central electrode (motor activity)",
            4: "F5: EEG P3 - Left parietal electrode (attention)",
            5: "F6: EEG P4 - Right parietal electrode (attention)",
            6: "F7: EEG O1 - Left occipital electrode (visual processing)",
            7: "F8: EEG O2 - Right occipital electrode (visual processing)",
            8: "F9: EEG F7 - Left temporal electrode (language)",
            9: "F10: EEG F8 - Right temporal electrode (language)",
            10: "F11: EEG T3 - Left temporal electrode (emotion processing)",
            11: "F12: EEG T4 - Right temporal electrode (emotion processing)",
            12: "F13: EEG T5 - Left posterior temporal electrode",
            13: "F14: EEG T6 - Right posterior temporal electrode",
            14: "F15: Alpha power (8-12 Hz) - Relaxation state",
            15: "F16: Beta power (12-30 Hz) - Active thinking",
            16: "F17: Gamma power (30-100 Hz) - High-level cognition",
            17: "F18: Theta power (4-8 Hz) - Deep relaxation/meditation",
            18: "F19: Delta power (0.5-4 Hz) - Deep sleep",
            19: "F20: Alpha/Beta ratio - Relaxation vs alertness",
            20: "F21: Theta/Beta ratio - Meditation vs focus",
            21: "F22: Frontal asymmetry (F4-F3) - Emotional valence",
            22: "F23: Parietal asymmetry (P4-P3) - Spatial attention",
            23: "F24: Temporal asymmetry (T4-T3) - Language processing",
            24: "F25: F3 mean amplitude - Left frontal activity",
            25: "F26: F4 mean amplitude - Right frontal activity",
            26: "F27: C3 variance - Left central variability",
            27: "F28: C4 variance - Right central variability",
            28: "F29: P3 standard deviation - Left parietal consistency",
            29: "F30: P4 standard deviation - Right parietal consistency",
            30: "F31: Frontal coherence - F3-F4 synchronization",
            31: "F32: Central coherence - C3-C4 synchronization",
            32: "F33: Parietal coherence - P3-P4 synchronization",
            33: "F34: Cross-hemispheric coherence - Overall sync",
            34: "F35: Frontal-central coherence - FC connectivity",
            35: "F36: Central-parietal coherence - CP connectivity",
            36: "F37: Alpha peak frequency - Individual alpha freq",
            37: "F38: Beta peak frequency - Individual beta freq", 
            38: "F39: Power spectral density - Overall brain activity",
            39: "F40: Spectral entropy - Complexity measure",
            40: "F41: Hjorth mobility - Signal mobility parameter",
            41: "F42: Hjorth complexity - Signal complexity parameter",
            42: "F43: Zero crossing rate - Signal regularity",
            43: "F44: Approximate entropy - Signal predictability",
            44: "F45: Sample entropy - Signal complexity measure"
        };
        
        inputs.forEach((input, index) => {
            const description = featureDescriptions[index] || `F${index + 1}: Brain signal measurement`;
            input.title = description;
            input.setAttribute('data-tooltip', description);
            // Set the data-index for CSS feature number display
            input.setAttribute('data-index', index + 1);
        });
        
        console.log('Feature tooltips added for all 45 features with proper numbering');
    }

    static initInputValidation() {
        const inputs = document.querySelectorAll('.feature-input');
        
        inputs.forEach((input, index) => {
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
        });
        
        console.log(`Input validation initialized for ${inputs.length} inputs`);
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
            input.title = input.getAttribute('data-tooltip') + ' | ERROR: Invalid number';
            return false;
        } else {
            input.classList.add('valid');
            input.title = input.getAttribute('data-tooltip') + ` | Value: ${numValue}`;
            return true;
        }
    }

    static validateForm() {
        const inputs = document.querySelectorAll('.feature-input');
        let hasValidInput = false;
        let invalidCount = 0;
        
        inputs.forEach(input => {
            const isValid = this.validateInput(input);
            const hasValue = input.value.trim() !== '';
            
            if (hasValue && isValid) {
                hasValidInput = true;
            } else if (hasValue && !isValid) {
                invalidCount++;
            }
        });
        
        if (!hasValidInput) {
            NotificationManager.warning('Please enter some feature values or use test patterns');
            return false;
        }
        
        if (invalidCount > 0) {
            NotificationManager.error(`${invalidCount} invalid values detected. Please fix them.`);
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
        
        NotificationManager.info('Analyzing neural patterns...', 2000);
        
        // FIXED: Prevent page jump - smooth scroll to results area
        setTimeout(() => {
            const resultSection = document.querySelector('.result-section');
            if (resultSection) {
                resultSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }
        }, 100);
        
        return true;
    }

    static logSubmissionStats() {
        const inputs = document.querySelectorAll('.feature-input');
        const values = Array.from(inputs).map(input => parseFloat(input.value) || 0);
        
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
            pattern: appState.currentPattern || 'manual',
            predictedEmotion: this.predictEmotion(values)
        };
        
        console.log('Submitting emotion analysis:', stats);
        appState.setResults(stats);
    }

    // Emotion prediction based on ranges
    static predictEmotion(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        
        if (mean >= -5 && mean <= -0.1) return 'Likely POSITIVE';
        if (mean <= -10000) return 'Likely NEGATIVE';
        if (mean >= -200 && mean <= 200) return 'Likely NEUTRAL (zero)';
        if (mean >= 5000) return 'Likely NEUTRAL (high)';
        return 'Uncertain';
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
        console.log('⌨️ Keyboard shortcuts enabled');
        
        setTimeout(() => {
            console.log('⌨️ Available shortcuts:');
            console.log('  Ctrl+1: Fill positive values');
            console.log('  Ctrl+2: Fill negative values');
            console.log('  Ctrl+3: Fill neutral values');
            console.log('  Ctrl+R: Fill random values');
            console.log('  Ctrl+Enter: Start analysis');
            console.log('  Ctrl+0: Clear all values');
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
                case 'r':
                case 'R':
                    event.preventDefault();
                    fillRandom();
                    break;
                case 'Enter':
                    event.preventDefault();
                    document.getElementById('predictBtn')?.click();
                    break;
                case '0':
                    event.preventDefault();
                    this.clearAllInputs();
                    break;
            }
        }
    }

    static clearAllInputs() {
        const inputs = document.querySelectorAll('.feature-input');
        inputs.forEach(input => {
            input.value = '0';
            input.classList.remove('valid', 'invalid');
        });
        appState.setPattern('cleared');
        NotificationManager.info('All values cleared');
        console.log('🧹 All inputs cleared');
    }
}

// Animation manager
class AnimationManager {
    static init() {
        this.addStarfield();
        this.animateExistingResults();
        this.addDynamicStyles();
        console.log('🎨 Animation manager initialized');
    }

    // 🆕 Add animated starfield like the website
    static addStarfield() {
        const starfield = document.createElement('div');
        starfield.className = 'starfield';
        document.body.appendChild(starfield);
        console.log('⭐ Animated starfield added');
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
        
        const confidenceFill = card.querySelector('.confidence-fill');
        if (confidenceFill) {
            const targetWidth = confidenceFill.style.width;
            confidenceFill.style.width = '0%';
            
            setTimeout(() => {
                confidenceFill.style.transition = 'width 2s ease';
                confidenceFill.style.width = targetWidth;
            }, 800);
        }
        
        const probFills = card.querySelectorAll('.prob-fill');
        probFills.forEach((fill, index) => {
            const targetWidth = fill.style.width;
            fill.style.width = '0%';
            
            setTimeout(() => {
                fill.style.transition = 'width 1.5s ease';
                fill.style.width = targetWidth;
            }, 1000 + (index * 300));
        });
    }

    static addDynamicStyles() {
        if (document.getElementById('dynamic-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'dynamic-animations';
        style.textContent = `
            .positive-feedback { 
                border-color: #4caf50 !important; 
                box-shadow: 0 0 15px rgba(76, 175, 80, 0.6) !important;
            }
            .negative-feedback { 
                border-color: #f44336 !important; 
                box-shadow: 0 0 15px rgba(244, 67, 54, 0.6) !important;
            }
            .neutral-feedback { 
                border-color: #607d8b !important; 
                box-shadow: 0 0 15px rgba(96, 125, 139, 0.6) !important;
            }
            
            @keyframes buttonPress {
                0% { transform: scale(1); }
                50% { transform: scale(0.95); }
                100% { transform: scale(1); }
            }
            
            .btn-pressed {
                animation: buttonPress 0.2s ease;
            }
        `;
        document.head.appendChild(style);
    }

    static addButtonFeedback(button) {
        button.classList.add('btn-pressed');
        setTimeout(() => button.classList.remove('btn-pressed'), 200);
    }
}

// Debug utilities
class DebugUtils {
    static logCurrentValues() {
        const inputs = document.querySelectorAll('.feature-input');
        const values = Array.from(inputs).map(input => parseFloat(input.value) || 0);
        
        const stats = {
            total: values.length,
            nonZero: values.filter(v => v !== 0).length,
            positive: values.filter(v => v > 0).length,
            negative: values.filter(v => v < 0).length,
            zero: values.filter(v => v === 0).length,
            range: {
                min: Math.min(...values),
                max: Math.max(...values),
                mean: values.reduce((a, b) => a + b, 0) / values.length,
                median: this.getMedian(values)
            },
            predictions: this.predictPattern(values),
            sample: values.slice(0, 10),
            rangeAnalysis: this.analyzeRanges(values)
        };
        
        console.log('🔍 Current feature analysis:', stats);
        return stats;
    }

    static getMedian(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    static predictPattern(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        
        if (mean >= -5 && mean <= -0.1) return 'Likely POSITIVE (small negative)';
        if (mean <= -10000) return 'Likely NEGATIVE (large negative)';
        if (mean >= -200 && mean <= 200) return 'Likely NEUTRAL (zero range)';
        if (mean >= 5000) return 'Likely NEUTRAL (large positive)';
        return 'Uncertain - mixed values';
    }

    static analyzeRanges(values) {
        const positiveRange = values.filter(v => v >= -5 && v <= -0.1).length;
        const negativeRange = values.filter(v => v <= -10000).length;
        const neutralZero = values.filter(v => v >= -200 && v <= 200).length;
        const neutralHigh = values.filter(v => v >= 5000).length;
        
        return {
            positiveRange,
            negativeRange,
            neutralZero,
            neutralHigh,
            dominant: this.getDominantRange(positiveRange, negativeRange, neutralZero, neutralHigh)
        };
    }

    static getDominantRange(pos, neg, neuZero, neuHigh) {
        const max = Math.max(pos, neg, neuZero, neuHigh);
        if (max === pos) return 'POSITIVE range dominant';
        if (max === neg) return 'NEGATIVE range dominant';
        if (max === neuZero) return 'NEUTRAL-zero range dominant';
        if (max === neuHigh) return 'NEUTRAL-high range dominant';
        return 'No dominant range';
    }

    static analyzeFeatureImportance() {
        console.log('EEG FEATURE ANALYSIS:');
        console.log('45 features represent:');
        console.log('   - F1-F14: EEG electrode measurements');
        console.log('     • F3/F4: Frontal asymmetry (emotional valence)');
        console.log('     • C3/C4: Central motor activity');
        console.log('     • P3/P4: Parietal attention processing');
        console.log('     • T3/T4: Temporal emotion processing');
        console.log('   - F15-F21: Frequency band powers');
        console.log('     • Alpha (8-12Hz): Relaxation');
        console.log('     • Beta (12-30Hz): Active thinking');
        console.log('     • Gamma (30-100Hz): High cognition');
        console.log('     • Theta (4-8Hz): Meditation');
        console.log('   - F22-F33: Asymmetry & Coherence');
        console.log('     • Hemispheric differences');
        console.log('     • Cross-channel synchronization');
        console.log('   - F34-F45: Advanced metrics');
        console.log('     • Spectral entropy, Hjorth parameters');
        console.log('     • Signal complexity measures');
    }
}

// Global functions for HTML buttons
function fillPositive() {
    FeatureFiller.positive();
    AnimationManager.addButtonFeedback(event?.target);
}

function fillNegative() {
    FeatureFiller.negative();
    AnimationManager.addButtonFeedback(event?.target);
}

function fillNeutral() {
    FeatureFiller.neutral();
    AnimationManager.addButtonFeedback(event?.target);
}

function fillRandom() {
    FeatureFiller.random();
    AnimationManager.addButtonFeedback(event?.target);
}

// Extreme test functions
function fillExtremePositive() {
    FeatureFiller.extremePositive();
    AnimationManager.addButtonFeedback(event?.target);
}

function fillExtremeNegative() {
    FeatureFiller.extremeNegative();
    AnimationManager.addButtonFeedback(event?.target);
}

function fillExtremeNeutralZero() {
    FeatureFiller.extremeNeutralZero();
    AnimationManager.addButtonFeedback(event?.target);
}

function fillSmartRandom() {
    FeatureFiller.smartRandom();
    AnimationManager.addButtonFeedback(event?.target);
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
window.analyzeFeatures = () => DebugUtils.analyzeFeatureImportance();
window.appState = appState;

// App initialization
class BrainEmotionApp {
    static init() {
        console.log('Brain Emotion Detection App Starting...');
        
        try {
            FormHandler.init();
            KeyboardManager.init();
            AnimationManager.init();
            
            // Log configuration
            console.log('App initialized successfully');
            console.log(`Features expected: ${CONFIG.TOTAL_FEATURES}`);
            console.log('FIXED: Random values now cover ALL emotion ranges!');
            console.log('Model behavior mapping:');
            console.log('   POSITIVE  ← Small negative values (-3 to -0.5)');
            console.log('   NEGATIVE  ← Large negative values (-80k to -15k)');  
            console.log('   NEUTRAL   ← Zero range (-100 to +100) OR large positive (10k+)');
            
            setTimeout(() => {
                NotificationManager.info('Brain Emotion Detection ready! All 45 features have tooltips. Try the fixed Random button!', 5000);
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
    console.log('🎉 Page fully loaded with animated background');
    FormHandler.resetLoadingState();
    
    // Test random generation
    setTimeout(() => {
        console.log('Testing random generation ranges:');
        console.log('Use fillRandom() to test - should now give mixed emotions!');
    }, 2000);
});