# PowerShell post-build script for Structura
# Renames the release binary to Structura-Portable.exe and copies it to the bundle folder

$releaseDir = "src-tauri/target/release"
$bundleDir = "$releaseDir/bundle/nsis"
$sourceExe = "$releaseDir/Structura.exe"
$destExe = "$bundleDir/Structura-Portable.exe"

Write-Host "Verificando existencia de $sourceExe..."
if (Test-Path $sourceExe) {
    if (-not (Test-Path $bundleDir)) {
        New-Item -ItemType Directory -Path $bundleDir -Force
    }
    Copy-Item -Path $sourceExe -Destination $destExe -Force
    Write-Host "Éxito: Se ha copiado y renombrado el ejecutable portable a: $destExe"
} else {
    Write-Warning "No se encontró el ejecutable en $sourceExe. ¿Se ejecutó 'tauri build'?"
}
