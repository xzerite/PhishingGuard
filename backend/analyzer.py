import re
import math
from urllib.parse import urlparse
import tldextract
import Levenshtein
from model_service import extract_features, predict_phishing
import requests
from bs4 import BeautifulSoup
from typing import Any

# List of common target domains for phishing
TOP_DOMAINS = [
    "google.com", "facebook.com", "amazon.com", "apple.com", "microsoft.com",
    "netflix.com", "paypal.com", "visa.com", "mastercard.com", "bankofamerica.com",
    "chase.com", "wellsfargo.com", "binance.com", "coinbase.com"
]

def calculate_entropy(text):
    if not text:
        return 0
    entropy = 0
    for x in range(256):
        p_x = float(text.count(chr(x))) / len(text)
        if p_x > 0:
            entropy += - p_x * math.log(p_x, 2)
    return entropy

def check_domain_similarity(domain: str) -> tuple[bool, str | None]:
    extracted = tldextract.extract(domain)
    domain_name = extracted.domain
    
    # Split domain name by hyphens to check individual parts
    parts = domain_name.split('-')
    
    for target in TOP_DOMAINS:
        target_extracted = tldextract.extract(target)
        target_name = target_extracted.domain
        
        # Check the whole domain name and each part
        checks = [domain_name] + parts
        
        for candidate in checks:
            # Check for typosquatting (Levenshtein distance)
            distance = Levenshtein.distance(candidate, target_name)
            if 0 < distance <= 2:
                return True, target
                
            # Check if target name is hidden in the candidate
            if target_name in candidate and candidate != target_name:
                return True, target
            
            # Check if candidate is hidden in target (unlikely but safe)
            if candidate in target_name and len(candidate) > 3 and candidate != target_name:
                return True, target
            
    return False, None

def analyze_url(url: str) -> dict[str, Any]:
    results: dict[str, Any] = {
        "is_phishing": False,
        "risk_score": 0,
        "reasons": []
    }
    
    parsed = urlparse(url)
    domain = parsed.netloc
    path = parsed.path
    
    # 1. Check for IP address instead of domain
    ip_pattern = re.compile(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$')
    if ip_pattern.match(domain):
        results["risk_score"] += 30
        results["reasons"].append("URL uses an IP address instead of a domain name.")

    # 2. Check URL length
    if len(url) > 75:
        results["risk_score"] += 10
        results["reasons"].append("URL is unusually long.")

    # 3. Check for specific characters (@, -, .)
    if "@" in url:
        results["risk_score"] += 20
        results["reasons"].append("URL contains '@' symbol, often used to hide the real domain.")
        
    if domain.count(".") > 3:
        results["risk_score"] += 15
        results["reasons"].append("Excessive subdomains detected.")

    # 4. Domain similarity (Typosquatting)
    is_similar, target = check_domain_similarity(domain)
    if is_similar:
        results["risk_score"] += 50
        results["reasons"].append(f"Domain looks suspiciously similar to '{target}'.")

    # 5. Check for HTTPS
    if parsed.scheme != "https":
        results["risk_score"] += 20
        results["reasons"].append("Connection is not secure (HTTP instead of HTTPS).")

    # 6. Entropy check (Random looking strings)
    entropy = calculate_entropy(domain)
    if entropy > 4.5:
        results["risk_score"] += 15
        results["reasons"].append("Domain name appears to be randomly generated.")

    # 7. Content Analysis (Simulated) and ML Score
    try:
        # We only fetch content if the risk is already moderate or for deeper analysis
        # In a real scenario, the extension might send the HTML content directly
        # For this demo, we'll extract features from the URL
        ml_features = extract_features(url)
        ml_score = predict_phishing(ml_features)
        
        if ml_score > 0.7:
            results["risk_score"] += int(ml_score * 30)
            results["reasons"].append(f"AI model detected phishing patterns (Confidence: {int(ml_score*100)}%).")
    except:
        pass

    # Final decision threshold
    if results["risk_score"] >= 50:
        results["is_phishing"] = True
        
    return results
