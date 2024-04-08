$scriptDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
Set-Location -Path $scriptDir
Start-Process -FilePath "npm" -ArgumentList "run dev" -NoNewWindow -RedirectStandardOutput "./log.txt"
klogg "./log.txt"