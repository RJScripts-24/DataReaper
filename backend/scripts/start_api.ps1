$env:PYTHONPATH = "src"
$env:APP_DEBUG = "false"
$env:APP_LOG_LEVEL = "WARNING"
$env:APP_AUTO_CREATE_TABLES = "false"

if (Get-Command uv -ErrorAction SilentlyContinue) {
	uv run uvicorn datareaper.main:app --host 127.0.0.1 --port 8000 --app-dir src --log-level warning --no-access-log
} else {
	& "C:/Users/Harsh Singhal/AppData/Local/Programs/Python/Python314/python.exe" -m uvicorn datareaper.main:app --host 127.0.0.1 --port 8000 --app-dir src --log-level warning --no-access-log
}
