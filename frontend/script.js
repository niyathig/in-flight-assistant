const API_BASE = "http://localhost:8000";

const messageInput = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");
const clearBtn = document.getElementById("clearBtn");
const outputSection = document.getElementById("outputSection");
const resultsDiv = document.getElementById("results");

submitBtn.addEventListener("click", handleTranslate);
clearBtn.addEventListener("click", handleClear);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) {
        handleTranslate();
    }
});

async function handleTranslate() {
    const message = messageInput.value.trim();
    if (!message) {
        alert("Please enter a message");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";
    outputSection.classList.add("hidden");

    try {
        const response = await fetch(`${API_BASE}/translate`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message }),
        });

        const data = await response.json();

        if (data.success) {
            displayResults(data);
        } else {
            displayError(data.error || "Unknown error occurred");
        }
    } catch (error) {
        displayError(`Connection failed: ${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Translate & Extract";
    }
}

function displayResults(data) {
    const sample = data.sample;
    resultsDiv.innerHTML = `
        <div class="result-card">
            <h3>Detected Language</h3>
            <p>${sample.detected_language}</p>
        </div>
        <div class="result-card">
            <h3>Translation (English)</h3>
            <p>${sample.raw_translation}</p>
        </div>
        <div class="result-card">
            <h3>S - Symptoms</h3>
            <p>${sample.symptoms}</p>
        </div>
        <div class="result-card">
            <h3>A - Allergies</h3>
            <p>${sample.allergies}</p>
        </div>
        <div class="result-card">
            <h3>M - Medications</h3>
            <p>${sample.medications}</p>
        </div>
        <div class="result-card">
            <h3>P - Past Medical History</h3>
            <p>${sample.past_medical_history}</p>
        </div>
        <div class="result-card">
            <h3>L - Last Oral Intake</h3>
            <p>${sample.last_oral_intake}</p>
        </div>
        <div class="result-card">
            <h3>E - Events</h3>
            <p>${sample.events}</p>
        </div>
    `;
    outputSection.classList.remove("hidden");
}

function displayError(error) {
    resultsDiv.innerHTML = `
        <div class="result-card error-card">
            <h3>Error</h3>
            <p>${error}</p>
        </div>
    `;
    outputSection.classList.remove("hidden");
}

function handleClear() {
    messageInput.value = "";
    outputSection.classList.add("hidden");
    messageInput.focus();
}
