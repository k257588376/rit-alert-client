$env:NODE_ENV = 'production'; 
Start-Process node -Args "$PSScriptRoot\src\index.ts" -RedirectStandardOutput "$PSScriptRoot\output.log" -RedirectStandardError "$PSScriptRoot\error.log" -WindowStyle Hidden