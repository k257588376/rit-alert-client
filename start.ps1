$env:NODE_ENV = 'production'; 
Start-Process node -Args "$PSScriptRoot\index.ts" -RedirectStandardOutput "$PSScriptRoot\output.log" -RedirectStandardError "$PSScriptRoot\error.log" -WindowStyle Hidden