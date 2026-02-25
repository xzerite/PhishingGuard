# model_service.py
import numpy as np # Re-scan trigger

def predict_phishing(url_features):
    """
    In a real implementation, this would load a pre-trained 
    XGBoost or Random Forest model and return a probability.
    
    For now, it returns a simulated score based on feature weights.
    """
    # Simulate ML feature weights
    # 0: URL Length, 1: Is HTTPS, 2: Domain Age (simulated), 3: Form count (simulated)
    weights = np.array([0.1, -0.4, -0.2, 0.3])
    bias = 0.2
    
    # Calculate weighted sum (simulated inference)
    score = np.dot(url_features, weights) + bias
    
    # Sigmoid to get probability
    probability = 1 / (1 + np.exp(-score))
    
    return float(probability)

def extract_features(url, soup=None):
    """
    Extract features for the ML model.
    """
    features = []
    
    # 1. URL Length (normalized)
    features.append(min(len(url) / 200, 1.0))
    
    # 2. Is HTTPS
    features.append(1.0 if url.startswith("https") else 0.0)
    
    # 3. Simulated Domain Age (0 = new, 1 = old)
    # In reality, this would query WHOIS
    features.append(0.5) 
    
    # 4. Form count (from BeautifulSoup if available)
    if soup:
        form_count = len(soup.find_all('form'))
        features.append(min(form_count / 5, 1.0))
    else:
        features.append(0.0)
        
    return np.array(features)
