param(
    [string]$Tag,
    [string]$Npm,
    [switch]$Clear
)

$scriptPath = Join-Path $PSScriptRoot "apply-threejs-version.mjs"
if (-not (Test-Path $scriptPath)) {
    Write-Error "Unable to locate apply-threejs-version.mjs"
    exit 1
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error "Node.js is required to run this script. Please install Node 18+."
    exit 1
}

$argsList = @()
if ($Tag) { $argsList += "--tag"; $argsList += $Tag }
if ($Npm) { $argsList += "--npm"; $argsList += $Npm }
if ($Clear) { $argsList += "--clear" }

& $node.Source $scriptPath @argsList
