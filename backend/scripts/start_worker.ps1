$env:PYTHONPATH = "src"
$env:APP_DEBUG = "false"
$env:APP_LOG_LEVEL = "WARNING"
$env:APP_AUTO_CREATE_TABLES = "false"

if (Get-Command uv -ErrorAction SilentlyContinue) {
	uv run arq datareaper.workers.scheduler.WorkerSettings
} else {
	& "C:/Users/Harsh Singhal/AppData/Local/Programs/Python/Python314/python.exe" -m arq datareaper.workers.scheduler.WorkerSettings
}
