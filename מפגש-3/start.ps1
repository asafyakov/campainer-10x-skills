# הפעלת Agent Server — קמפיינר 10X
# Windows בלבד. הרץ: .\start.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# עצור agent ישן אם רץ
$conn = Get-NetTCPConnection -LocalPort 3141 -ErrorAction SilentlyContinue
if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep 1
}

# הפעל
Start-Process -FilePath "node" -ArgumentList "$ScriptDir\campaigner-agent\bin\cli.js" -WindowStyle Hidden
Start-Sleep 4

# בדוק
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:3141/health" -ErrorAction Stop
    if ($res.status -eq "ok") {
        Write-Host ""
        Write-Host "✅ Agent Server רץ — http://127.0.0.1:3141"
        Write-Host "   פתח את הדשבורד: https://agency-dashboard-10x.vercel.app"
        Write-Host "   (אל תסגור את הטרמינל)"
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "❌ Agent Server לא עלה."
    Write-Host "   נסה: node campaigner-agent\bin\cli.js"
    Write-Host ""
}
