#!/usr/bin/env python3
"""
Milestone 2 test suite: Validate robust JSON output and error handling.
Run: python test_milestone2.py
"""
import requests
import json
import sys

API_URL = "http://localhost:8000/translate"

test_cases = [
    {
        "name": "Spanish - headache + allergy",
        "message": "Me duele la cabeza y tengo alergia a la penicilina",
    },
    {
        "name": "French - chest pain",
        "message": "J'ai une douleur à la poitrine et je prends du paracétamol",
    },
    {
        "name": "Mandarin - nausea",
        "message": "我感到恶心，并且对花生过敏",
    },
    {
        "name": "Very short input",
        "message": "help",
    },
    {
        "name": "Numbers and symbols",
        "message": "!!!???@@@ 123 abc",
    },
    {
        "name": "Mixed languages",
        "message": "I have fever pero también tengo tos y estoy tomando aspirin",
    },
]

required_fields = [
    "symptoms",
    "allergies",
    "medications",
    "past_medical_history",
    "last_oral_intake",
    "events",
    "raw_translation",
    "detected_language",
]

def test_single(test_case):
    """Test a single case and validate output structure."""
    print(f"\n{'='*60}")
    print(f"TEST: {test_case['name']}")
    print(f"INPUT: {test_case['message']}")
    print(f"{'-'*60}")

    try:
        response = requests.post(API_URL, json={"message": test_case["message"]}, timeout=30)
        response.raise_for_status()
        data = response.json()

        # Check top-level structure
        assert "success" in data, "Missing 'success' field"
        assert "sample" in data, "Missing 'sample' field"

        # Check SAMPLE structure
        sample = data["sample"]
        for field in required_fields:
            assert field in sample, f"Missing SAMPLE field: {field}"
            assert isinstance(sample[field], str), f"Field '{field}' is not a string"

        # Validate non-empty critical fields
        assert sample["raw_translation"].strip(), "Translation is empty"
        assert sample["detected_language"].strip(), "Language detection is empty"

        print(f"✅ SUCCESS")
        print(f"   Language: {sample['detected_language']}")
        print(f"   Translation: {sample['raw_translation'][:60]}...")
        print(f"   Symptoms: {sample['symptoms']}")
        print(f"   Allergies: {sample['allergies']}")
        return True

    except requests.exceptions.RequestException as e:
        print(f"❌ HTTP ERROR: {e}")
        return False
    except AssertionError as e:
        print(f"❌ VALIDATION ERROR: {e}")
        return False
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("MILESTONE 2: ROBUST JSON OUTPUT TESTING")
    print("="*60)

    passed = 0
    failed = 0

    for test_case in test_cases:
        if test_single(test_case):
            passed += 1
        else:
            failed += 1

    print(f"\n{'='*60}")
    print(f"RESULTS: {passed} passed, {failed} failed")
    print(f"{'='*60}\n")

    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
