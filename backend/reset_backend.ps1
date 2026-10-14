# reset_backend.ps1 - Recreates the Python virtual environment and installs dependencies
# -------------------------------------------------
# 1️⃣ Kill any stray Python processes that may lock venv files
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

# 2️⃣ Remove the existing virtual environment (ignore errors if it doesn't exist)
$venvPath = "${PSScriptRoot}\venv"
if (Test-Path $venvPath) {
    Remove-Item -Recurse -Force $venvPath
}

# 3️⃣ Create a fresh virtual environment
python -m venv venv

# 4️⃣ Activate the new environment
& "${PSScriptRoot}\venv\Scripts\Activate.ps1"

# 5️⃣ Ensure pip is up‑to‑date
pip install --upgrade pip

# 6️⃣ Add missing dj-database-url to requirements if not present
$reqFile = "${PSScriptRoot}\requirements.txt"
if (-not (Select-String -Path $reqFile -Pattern "dj-database-url" -Quiet)) {
    Add-Content -Path $reqFile -Value "\ndj-database-url==1.3.0"
}

# 7️⃣ Install all Python dependencies
pip install -r requirements.txt

# 8️⃣ Apply migrations and start the Django dev server (optional – comment out if not needed)
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
# -------------------------------------------------
